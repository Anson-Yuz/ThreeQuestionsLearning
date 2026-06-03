import uuid
import json
import asyncio
import re
from datetime import datetime
from urllib.parse import urlparse, quote
from typing import List, Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, BackgroundTasks, HTTPException

from database import get_db
from models import SuccessResponse, SearchDiscoverRequest, ImportRequest, CourseCreate
from routers.sse import push_event

router = APIRouter()

# 内网 IP 正则（SSRF 防护）
_PRIVATE_IP = re.compile(
    r'^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.|224\.|240\.)'
)
_LOCAL_HOSTS = {'localhost', '0.0.0.0', '127.0.0.1', '::1'}

USER_AGENT = 'Sanwen-Learning-Bot/1.0'
SEARCH_TIMEOUT = 10
FETCH_TIMEOUT = 15
MAX_BODY_SIZE = 1_000_000  # 1MB
CACHE_TTL = 30 * 60 * 1000  # 30 minutes in ms
FETCH_CONCURRENCY = 5


def _is_private_url(url: str) -> bool:
    """检查 URL 是否指向内网（SSRF 防护）"""
    try:
        p = urlparse(url)
        if p.scheme not in ('http', 'https'):
            return True
        host = (p.hostname or '').lower()
        if not host:
            return True
        if host in _LOCAL_HOSTS:
            return True
        if _PRIVATE_IP.match(host):
            return True
        return False
    except Exception:
        return True


def _clean_html(html: str) -> str:
    """从 HTML 提取正文"""
    soup = BeautifulSoup(html, 'lxml')
    # 去掉无用标签
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript']):
        tag.decompose()
    text = soup.get_text(separator='\n', strip=True)
    # 合并空白行
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text[:MAX_BODY_SIZE]


def _chunk_text(text: str, size: int = 500) -> List[str]:
    """将文本按指定字数分块"""
    chunks = []
    for i in range(0, len(text), size):
        chunks.append(text[i:i + size])
    return chunks


async def web_search_background(course_id: str, query: str):
    """后台执行互联网搜索 + LLM 排序 + SSE 推送"""
    now = int(datetime.now().timestamp() * 1000)

    # 1. 检查缓存（5 分钟内）
    with get_db() as conn:
        row = conn.execute(
            "SELECT results, created_at FROM search_cache WHERE course_id = ?",
            (course_id,)
        ).fetchone()
        if row and (now - row["created_at"]) < CACHE_TTL:
            cached = json.loads(row["results"])
            push_event(course_id, "discover_ready", {"results": cached, "cached": True})
            return

    # 2. 搜索
    ranked = await _search_web(query)

    if not ranked:
        push_event(course_id, "discover_ready", {"results": [], "message": "未找到相关资料"})
        return

    # 3. 存入缓存 + 推送
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO search_cache (course_id, results, created_at) VALUES (?, ?, ?)",
            (course_id, json.dumps(ranked, ensure_ascii=False), now)
        )
        conn.commit()

    push_event(course_id, "discover_ready", {"results": ranked})


async def _rank_results(query: str, items: list) -> list:
    """用 MiniMax LLM 批量打分排序"""
    items_text = "\n".join(
        f"{i}: URL={it['url']} TITLE={it['title']} SNIPPET={it['snippet']}"
        for i, it in enumerate(items)
    )
    prompt = (
        f"用户搜索: {query}\n\n"
        f"以下是搜索结果，请评估每个结果与用户搜索的相关性（0-10分）：\n{items_text}\n\n"
        f"返回严格JSON数组，不要markdown标记：\n"
        f'[{{"index":0,"score":8,"reason":"..."}}, ...]'
    )

    try:
        from services.llm_service import LLMService
        llm = LLMService()
        llm.api_key = "fc-b94c7744b5224b9b936478131d275d7b"
        raw = await llm.chat(prompt, temperature=0.3, max_tokens=2048)
        # 提取 JSON
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```\w*', '', raw)
            raw = re.sub(r'```$', '', raw)
        scores = json.loads(raw)
    except Exception:
        # LLM 失败则按原始顺序
        return [dict(it, score=5) for it in items]

    # 合并分数，取 top 10
    score_map = {s.get("index", 0): s.get("score", 5) for s in scores if isinstance(s, dict)}
    for i, it in enumerate(items):
        it["score"] = score_map.get(i, 5)
    items.sort(key=lambda x: x.get("score", 0), reverse=True)
    return items[:10]


async def _fetch_and_store_url(course_id: str, url: str, sem: asyncio.Semaphore) -> dict:
    """抓取单个 URL 并存入知识库"""
    result = {"url": url, "status": "failed", "reason": ""}

    async with sem:
        # 安全检查
        if _is_private_url(url):
            result["reason"] = "内网地址不允许抓取"
            return result

        # 去重
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id FROM documents WHERE source_url=? AND course_id=? AND source_type='web_discover'",
                (url, course_id)
            ).fetchone()
            if existing:
                result["status"] = "skipped"
                result["reason"] = "已导入"
                return result

        # 抓取
        try:
            async with httpx.AsyncClient(timeout=FETCH_TIMEOUT) as client:
                resp = await client.get(url, headers={"User-Agent": USER_AGENT})
                resp.raise_for_status()
                if len(resp.content) > MAX_BODY_SIZE:
                    resp.content = resp.content[:MAX_BODY_SIZE]
                # 自动检测编码
                resp.encoding = resp.encoding or 'utf-8'
                html = resp.text
        except Exception as e:
            result["reason"] = f"抓取失败: {str(e)}"
            return result

        # 提取正文
        try:
            text = _clean_html(html)
            if len(text) < 100:
                result["reason"] = "正文太短"
                return result
        except Exception as e:
            result["reason"] = f"解析失败: {str(e)}"
            return result

        # 存入 SQLite
        doc_id = str(uuid.uuid4())
        now = int(datetime.now().timestamp() * 1000)
        title = url.split("/")[-1][:100] or url[:100]
        try:
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO documents
                    (id, course_id, title, content, file_path, file_type, source, source_url, source_type, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (doc_id, course_id, title, text[:5000], "", "text/html", "web", url, "web_discover", now)
                )
                conn.commit()
        except Exception as e:
            result["reason"] = f"入库失败: {str(e)}"
            return result

        # 向量化 + 存入 ChromaDB
        try:
            from services.embedding_service import EmbeddingService
            from services.chroma_client import ChromaClient

            embedder = EmbeddingService()
            chroma = ChromaClient()

            chunks = _chunk_text(text[:5000])
            for ci, chunk in enumerate(chunks):
                vec = await embedder.embed(chunk)
                await chroma.add_documents(
                    course_id=course_id,
                    doc_ids=[f"{doc_id}_chunk_{ci}"],
                    texts=[chunk],
                    embeddings=[vec],
                    metadata=[{"doc_id": doc_id, "url": url, "chunk": ci}]
                )
        except Exception as e:
            print(f"⚠️ 向量化失败 {url}: {e}")

        result["status"] = "imported"
        result["doc_id"] = doc_id
        return result


# ====== API 端点 ======

async def _search_web(query: str) -> list:
    """网络搜索：优先使用 ddgs 库，失败回退到 HTML 解析"""
    raw_results = []

    # 1. 尝试 ddgs 库
    try:
        from concurrent.futures import ThreadPoolExecutor
        def _ddgs_search():
            from ddgs import DDGS
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=15):
                    if not _is_private_url(r.get("href", "")):
                        results.append({
                            "url": r.get("href", ""),
                            "title": r.get("title", ""),
                            "snippet": r.get("body", "")
                        })
            return results
        with ThreadPoolExecutor() as pool:
            raw_results = await asyncio.get_event_loop().run_in_executor(pool, _ddgs_search)
    except Exception as e:
        print(f"[search] ddgs failed: {e}")

    # 2. 回退：HTML 解析
    if not raw_results:
        try:
            async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT) as client:
                resp = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": query},
                    headers={"User-Agent": USER_AGENT}
                )
                resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')
            for item in soup.select('.result'):
                title_el = item.select_one('.result__title a')
                snippet_el = item.select_one('.result__snippet')
                if title_el:
                    href = title_el.get('href', '')
                    if 'uddg=' in href:
                        from urllib.parse import parse_qs
                        parsed = urlparse(href)
                        qs = parse_qs(parsed.query)
                        href = qs.get('uddg', [href])[0]
                    if not _is_private_url(href):
                        raw_results.append({
                            "url": href,
                            "title": title_el.get_text(strip=True),
                            "snippet": snippet_el.get_text(strip=True) if snippet_el else ""
                        })
        except Exception as e:
            print(f"[search] HTML fallback failed: {e}")

    if not raw_results:
        return []

    # LLM 打分排序
    try:
        return await _rank_results(query, raw_results[:15])
    except Exception as e:
        print(f"[search] LLM ranking failed: {e}, returning raw")
        for r in raw_results:
            r["score"] = 0.5
        return raw_results[:10]


# ====== API 端点 ======

@router.post("/sync")
async def sync_search(req: SearchDiscoverRequest):
    """同步搜索互联网资料，直接返回结果（不创建课程）"""
    if not req.query.strip():
        raise HTTPException(400, "query 不能为空")

    results = await _search_web(req.query)
    return {"results": results, "total": len(results)}


@router.post("/discover")
async def start_discover(req: dict, background_tasks: BackgroundTasks):
    """启动互联网资料搜索（异步，已有课程）"""
    course_id = req.get("course_id", "")
    query = req.get("query", "")

    if not course_id or not query:
        raise HTTPException(400, "course_id 和 query 不能为空")

    # 限流
    with get_db() as conn:
        today_start = int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
        count = conn.execute(
            "SELECT COUNT(*) FROM search_cache WHERE course_id=? AND created_at>=?",
            (course_id, today_start)
        ).fetchone()[0]
        if count >= 10:
            raise HTTPException(429, "今日搜索次数已达上限（10次）")

    background_tasks.add_task(web_search_background, course_id, query)
    return {"status": "started", "message": "搜索已启动"}


@router.post("/import-urls")
async def import_urls(req: ImportRequest):
    """批量导入 URL 到知识库（支持自动创建课程）"""
    urls = req.urls
    course_id = req.course_id

    # 自动创建课程
    if not course_id and req.query:
        import uuid as _uuid
        from datetime import datetime as _dt
        now = int(_dt.now().timestamp() * 1000)
        course_id = str(_uuid.uuid4())
        with get_db() as conn:
            conn.execute(
                "INSERT INTO courses (id, title, keywords, original_question, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (course_id, f"课程：{req.query}", json.dumps(["AI", "学习", "自定义"]), req.query, "active", now, now)
            )
            conn.commit()

    if not course_id:
        raise HTTPException(400, "请提供 course_id 或 query（用于自动创建课程）")
    if not urls:
        raise HTTPException(400, "urls 不能为空")
    if len(urls) > 20:
        raise HTTPException(400, "单次最多导入 20 个 URL")

    # 并发抓取
    sem = asyncio.Semaphore(FETCH_CONCURRENCY)
    tasks = [_fetch_and_store_url(course_id, url, sem) for url in urls]
    results = await asyncio.gather(*tasks)

    imported = [r for r in results if r["status"] == "imported"]
    failed = [r for r in results if r["status"] == "failed"]

    return {
        "imported": len(imported),
        "failed": len(failed),
        "skipped": len(results) - len(imported) - len(failed),
        "doc_ids": [r.get("doc_id") for r in imported],
        "course_id": course_id,
        "details": failed
    }
