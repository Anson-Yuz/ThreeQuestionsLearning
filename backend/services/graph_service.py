import json
import math
from typing import List, Dict, Optional, Tuple
from collections import Counter


PROMPT_GRAPH = """你是一位教育专家，请基于以下多份学习资料，构建一个揭示学科底层逻辑框架的知识图谱。

资料内容：
{combined_text}

要求：
1. **识别核心大概念**：提取 4-8 个构成该学科骨架的核心概念（Big Ideas），例如"面向对象"、"多态"、"继承"等，而不是零散的关键词。
2. **建立逻辑关系**：用边连接这些核心概念，关系必须描述学科内在逻辑（如：底层原理 → 上层应用、问题 → 解决方案、原因 → 结果、比较、层级包含等），严禁使用"相关"这类模糊描述。
3. **标注认知层次**：为每个节点分配 bloom_level：remember / understand / apply / analyze / evaluate / create。确保至少覆盖 3 个不同层次。
4. **突出阈值概念**：标记哪些概念是"阈值概念"（一旦理解就能打通多个知识点，是学习难点），属性 `is_threshold_concept` 为 true。

{doc_count_hint}

返回纯 JSON（不要 markdown 代码块），格式如下：
{{
  "nodes": [
    {{
      "id": "唯一ID",
      "name": "概念名称",
      "description": "一句话解释",
      "bloom_level": "remember/understand/apply/analyze/evaluate/create",
      "difficulty": 0.3-0.9,
      "is_threshold_concept": true/false
    }}
  ],
  "links": [
    {{
      "source": "概念ID",
      "target": "概念ID",
      "relation": "prerequisite/causes/contains/compares_with/contradicts/applies_to",
      "label": "关系简述（3-6字）",
      "strength": 0.5-1.0
    }}
  ]
}}
"""


class GraphService:
    """知识图谱生成与管理"""

    BLOOM_TO_CATEGORY = {
        "remember": "记忆",
        "understand": "理解",
        "apply": "应用",
        "analyze": "分析",
        "evaluate": "评价",
        "create": "创造",
    }

    RELATION_MAP = {
        "prerequisite": "prerequisite",
        "前提": "prerequisite",
        "前置": "prerequisite",
        "需要": "prerequisite",
        "causes": "causes",
        "导致": "causes",
        "引发": "causes",
        "引起": "causes",
        "contains": "contains",
        "包含": "contains",
        "组成": "contains",
        "构成": "contains",
        "compares_with": "compares_with",
        "对比": "compares_with",
        "比较": "compares_with",
        "contradicts": "contradicts",
        "矛盾": "contradicts",
        "对立": "contradicts",
        "applies_to": "applies_to",
        "应用": "applies_to",
        "使用": "applies_to",
        "related": "related",
        "相关": "related",
        "关联": "related",
    }

    def __init__(self, llm_service=None):
        self.llm = llm_service

    async def generate_graph(
        self,
        course_id: str,
        documents: List[Dict],
        course_title: str = "",
    ) -> Dict:
        """生成知识图谱 — 选取 top-k 最相关片段再调用 LLM"""
        if not documents:
            print(f"[graph] 课程 {course_id}: 无资料，跳过图谱生成")
            return {"nodes": [], "links": []}

        query_terms = " ".join(filter(None, [course_title, "核心框架", "底层逻辑"]))
        top_fragments = self._select_top_fragments(
            documents, top_k=6, fragment_len=500, query=query_terms
        )
        combined_text = "\n\n---\n\n".join(top_fragments)
        if not combined_text.strip():
            print(f"[graph] 课程 {course_id}: 资料内容为空")
            return {"nodes": [], "links": []}

        if not self.llm:
            print(f"[graph] 课程 {course_id}: LLM 服务不可用")
            return {"nodes": [], "links": []}

        doc_count_hint = ""
        if len(documents) < 3:
            doc_count_hint = "注：现有资料较少（<3份），请基于现有资料尽力提取核心概念，不必硬凑数量。"

        prompt = PROMPT_GRAPH.format(
            combined_text=combined_text[:4000],
            doc_count_hint=doc_count_hint,
        )
        print(
            f"[graph] 课程 {course_id}: 开始调用 LLM 生成图谱，"
            f"资料长度={len(combined_text)}，文档数={len(documents)}"
        )
        result = await self.llm.chat_json(prompt, temperature=0.3, max_tokens=4096)

        if result and isinstance(result.get("nodes"), list) and len(result["nodes"]) > 0:
            validated = self._validate_graph(result)
            validated = self._balance_bloom(validated)

            quality_ok, reason = self._check_quality(validated)
            if not quality_ok:
                print(
                    f"[graph] 课程 {course_id}: 质量不达标 ({reason})，"
                    f"回退到关键词占位图谱并触发后台重新生成"
                )
                self._schedule_regenerate(course_id, course_title)
                return self._calculate_layout(self._quick_fallback_graph(documents))

            print(
                f"[graph] 课程 {course_id}: 图谱节点={len(validated['nodes'])}，"
                f"链接={len(validated['links'])}"
            )
            dist = Counter(n.get("bloom_level") for n in validated["nodes"])
            print(f"[graph] bloom分布: {dict(dist)}")
            return self._calculate_layout(validated)

        print(f"[graph] 课程 {course_id}: LLM 未返回有效图谱节点，启用关键词降级")
        return self._calculate_layout(self._quick_fallback_graph(documents))

    def _check_quality(self, graph: Dict) -> Tuple[bool, str]:
        """质量门禁：节点数 / 关系多样性 / 阈值概念"""
        nodes = graph.get("nodes", [])
        links = graph.get("links", [])

        if len(nodes) < 4:
            return False, f"节点数不足4个（{len(nodes)}）"

        relations = [self._normalize_relation(l.get("relation", "related")) for l in links]
        if relations and all(r == "related" for r in relations):
            return False, "所有边都是 related 关系"

        if not any(n.get("is_threshold_concept") for n in nodes):
            return False, "缺少阈值概念"

        return True, ""

    def _schedule_regenerate(self, course_id: str, course_title: str) -> None:
        """质量不达标时触发后台线程重新生成（与请求事件循环解耦）"""
        import threading

        def _runner():
            try:
                import asyncio
                from database import get_db
                from services.llm_service import LLMService

                with get_db() as conn:
                    rows = conn.execute(
                        "SELECT id, title, content FROM documents WHERE course_id = ? LIMIT 5",
                        (course_id,),
                    ).fetchall()
                docs = [
                    {"id": r["id"], "title": r["title"], "content": r["content"] or ""}
                    for r in rows
                ]
                if not docs:
                    return
                llm = LLMService()
                gs = GraphService(llm)
                graph = asyncio.run(
                    gs.generate_graph(course_id, docs, course_title=course_title)
                )
                from datetime import datetime

                now = int(datetime.now().timestamp() * 1000)
                with get_db() as conn:
                    conn.execute(
                        "INSERT OR REPLACE INTO knowledge_graphs (course_id, graph_data, updated_at) "
                        "VALUES (?, ?, ?)",
                        (course_id, json.dumps(graph, ensure_ascii=False), now),
                    )
                    conn.commit()
                print(f"[graph] 课程 {course_id} 后台重新生成完成")
            except Exception as e:
                print(f"[graph] 课程 {course_id} 后台重新生成失败: {e}")

        threading.Thread(target=_runner, daemon=True).start()

    def _quick_fallback_graph(self, documents: List[Dict]) -> Dict:
        """基于关键词的快速占位图谱（保证空状态可显示基本结构）"""
        text = " ".join(
            (d.get("title") or "") + " " + (d.get("content") or "") for d in documents
        )
        if not text.strip():
            return {"nodes": [], "links": []}

        try:
            import jieba

            words = jieba.lcut(text)
        except Exception:
            words = list(text)

        word_freq: Dict[str, int] = {}
        for w in words:
            w = w.strip()
            if len(w) >= 2 and "\u4e00" <= w[0] <= "\u9fff":
                word_freq[w] = word_freq.get(w, 0) + 1

        top = [w for w, _ in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]]
        if not top:
            return {"nodes": [], "links": []}

        nodes = [
            {
                "id": f"kw{i}",
                "name": w,
                "description": "",
                "bloom_level": "understand",
                "category": "理解",
                "difficulty": 0.4,
                "is_threshold_concept": False,
            }
            for i, w in enumerate(top)
        ]
        links = []
        for i in range(len(nodes) - 1):
            links.append({
                "source": nodes[i]["id"],
                "target": nodes[i + 1]["id"],
                "relation": "related",
                "label": "相关",
                "strength": 0.5,
            })
        return {"nodes": nodes, "links": links}

    def _balance_bloom(self, graph: Dict) -> Dict:
        """确保至少覆盖 3 种 Bloom 分类（不强制六种）"""
        all_levels = ["remember", "understand", "apply", "analyze", "evaluate", "create"]
        nodes = graph.get("nodes", [])
        if len(nodes) < 4:
            return graph

        present = {n.get("bloom_level") for n in nodes if n.get("bloom_level") in all_levels}
        if len(present) >= 3:
            return graph

        missing = [lvl for lvl in all_levels if lvl not in present]
        counts = Counter(n.get("bloom_level") for n in nodes if n.get("bloom_level") in all_levels)
        print(f"[graph] bloom 覆盖 <3，缺少 {missing}，尝试再分配")

        for lvl in missing:
            donor_level = counts.most_common(1)[0][0] if counts else None
            if donor_level and counts[donor_level] > 1:
                for n in nodes:
                    if n.get("bloom_level") == donor_level:
                        n["bloom_level"] = lvl
                        counts[donor_level] -= 1
                        break

        return graph

    def _normalize_relation(self, rel: str) -> str:
        """将中英文关系名映射到英文枚举"""
        if not rel:
            return "related"
        return self.RELATION_MAP.get(rel.strip().lower(), "related")

    def _validate_graph(self, graph: Dict) -> Dict:
        """校验并清洗图谱数据：去重、过滤无效边、补全缺失字段"""
        valid_bloom = {"remember", "understand", "apply", "analyze", "evaluate", "create"}

        nodes = graph.get("nodes", [])
        seen_ids = set()
        clean_nodes = []
        for n in nodes:
            if not isinstance(n, dict) or not n.get("id"):
                continue
            nid = str(n["id"])
            if nid in seen_ids:
                continue
            seen_ids.add(nid)
            bloom = n.get("bloom_level") if n.get("bloom_level") in valid_bloom else "understand"
            clean_nodes.append({
                "id": nid,
                "name": str(n.get("name", nid)),
                "description": str(n.get("description", ""))[:200],
                "bloom_level": bloom,
                "category": self.BLOOM_TO_CATEGORY.get(bloom, "理解"),
                "difficulty": max(0.1, min(1.0, float(n.get("difficulty", 0.5)))),
                "is_threshold_concept": bool(n.get("is_threshold_concept", False)),
            })

        links = graph.get("links", [])
        clean_links = []
        seen_pairs = set()
        for e in links:
            if not isinstance(e, dict):
                continue
            src, tgt = str(e.get("source", "")), str(e.get("target", ""))
            if not src or not tgt or src == tgt:
                continue
            if src not in seen_ids or tgt not in seen_ids:
                continue
            pair = f"{src}->{tgt}"
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            clean_links.append({
                "source": src,
                "target": tgt,
                "relation": self._normalize_relation(e.get("relation", "related")),
                "label": str(e.get("label", ""))[:20],
                "strength": max(0.1, min(1.0, float(e.get("strength", 0.5)))),
            })

        return {"nodes": clean_nodes, "links": clean_links}

    def _calculate_layout(self, graph: Dict) -> Dict:
        """为图谱节点计算初始布局位置"""
        nodes = graph.get("nodes", [])
        if not nodes:
            return graph
        n = len(nodes)
        radius = 200
        cx, cy = 300, 300
        for i, node in enumerate(nodes):
            angle = (2 * math.pi * i) / n
            node["x"] = cx + radius * math.cos(angle)
            node["y"] = cy + radius * math.sin(angle)
        return graph

    def update_graph_incremental(self, existing_graph: Dict, new_document: Dict) -> Dict:
        """增量更新图谱"""
        return existing_graph

    def _select_top_fragments(
        self,
        documents: List[Dict],
        top_k: int = 6,
        fragment_len: int = 500,
        query: str = "",
    ) -> List[str]:
        """从多份资料中选取 top-k 个最相关片段用于 LLM prompt

        评分：query token + 文档标题 token 在片段中的命中数。query 通常包含课程标题
        与「核心框架 / 底层逻辑」等提示词。
        """
        if not documents:
            return []

        def _tokens(text: str) -> List[str]:
            return [t for t in (text or "") if len(t) > 1] or ([text] if text else [])

        query_tokens = _tokens(query)
        candidates = []
        for doc in documents:
            content = (doc.get("content") or "").strip()
            if not content:
                continue
            title = (doc.get("title") or "").strip()
            head = content[:fragment_len]
            title_tokens = _tokens(title)
            score = sum(1 for t in title_tokens if t in head)
            score += sum(1 for t in query_tokens if t in head) * 2
            candidates.append((score, len(head), head))

        candidates.sort(key=lambda x: (-x[0], -x[1]))
        return [c[2] for c in candidates[:top_k]]
