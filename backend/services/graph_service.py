import json
from typing import List, Dict, Optional

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

    def __init__(self, llm_service=None):
        self.llm = llm_service

    async def generate_graph(self, course_id: str, documents: List[Dict]) -> Dict:
        """生成知识图谱 — 选取 top-k 最相关片段再调用 LLM"""
        if not documents:
            print(f"[graph] 课程 {course_id}: 无资料，跳过图谱生成")
            return {"nodes": [], "links": []}

        # 选 top-k 最相关片段（基于关键词命中）
        top_fragments = self._select_top_fragments(documents, top_k=6, fragment_len=500)
        combined_text = "\n\n---\n\n".join(top_fragments)
        if not combined_text.strip():
            print(f"[graph] 课程 {course_id}: 资料内容为空")
            return {"nodes": [], "links": []}

        if not self.llm:
            print(f"[graph] 课程 {course_id}: LLM 服务不可用")
            return {"nodes": [], "links": []}

        prompt = f"""基于以下学习资料，生成一个知识图谱。

学习资料：
{combined_text[:4000]}

【核心要求】
按布鲁姆认知分类为每个概念标注 bloom_level。必须覆盖全部六种：
  remember（记忆）   - 基础事实、术语、定义
  understand（理解） - 概念解释、原理说明
  apply（应用）      - 实际用法、操作步骤
  analyze（分析）    - 对比、关系、结构
  evaluate（评价）   - 优缺点、价值判断
  create（创造）     - 设计、构建、创新

节点分配规则：总共12-20个节点，六种分类各2-3个，不得偏废。

请生成JSON（不要markdown代码块）：
{{
  "nodes": [
    {{"id":"c1","name":"概念名","description":"≤15字描述","bloom_level":"remember","difficulty":0.3,"is_threshold_concept":false}}
  ],
  "links": [
    {{"source":"c1","target":"c2","relation":"prerequisite","strength":0.8}}
  ]
}}

bloom_level 必为: remember / understand / apply / analyze / evaluate / create
relation 可选: prerequisite（前置依赖）、related（相关）、contradicts（矛盾）"""

        print(f"[graph] 课程 {course_id}: 开始调用 LLM 生成图谱，资料长度={len(combined_text)}，文档数={len(documents)}")
        result = await self.llm.chat_json(prompt, temperature=0.3, max_tokens=4096)

        if result and isinstance(result.get("nodes"), list) and len(result["nodes"]) > 0:
            validated = self._validate_graph(result)
            validated = self._balance_bloom(validated)
            print(f"[graph] 课程 {course_id}: 图谱节点={len(validated['nodes'])}，链接={len(validated['links'])}")
            # 打印 bloom 分布
            from collections import Counter
            dist = Counter(n.get("bloom_level") for n in validated["nodes"])
            print(f"[graph] bloom分布: {dict(dist)}")
            return self._calculate_layout(validated)

        print(f"[graph] 课程 {course_id}: LLM 未返回有效图谱节点")
        return {"nodes": [], "links": []}

    def _balance_bloom(self, graph: Dict) -> Dict:
        """确保六种 Bloom 分类都有覆盖。如果 LLM 偏废某些分类，尝试调整。"""
        all_levels = ["remember", "understand", "apply", "analyze", "evaluate", "create"]
        nodes = graph.get("nodes", [])
        if len(nodes) < 6:
            return graph

        present = {n.get("bloom_level") for n in nodes if n.get("bloom_level") in all_levels}
        missing = [lvl for lvl in all_levels if lvl not in present]
        if not missing:
            return graph

        # 从数量多的分类中借调节点给缺失分类
        from collections import Counter
        counts = Counter(n.get("bloom_level") for n in nodes if n.get("bloom_level") in all_levels)
        print(f"[graph] 缺少 bloom 分类: {missing}，尝试再分配")

        for lvl in missing:
            # 找数量最多的分类
            donor_level = counts.most_common(1)[0][0] if counts else None
            if donor_level and counts[donor_level] > 1:
                for n in nodes:
                    if n.get("bloom_level") == donor_level:
                        n["bloom_level"] = lvl
                        counts[donor_level] -= 1
                        break

        return graph

    def _validate_graph(self, graph: Dict) -> Dict:
        """校验并清洗图谱数据：去重、过滤无效边、补全缺失字段"""
        valid_bloom = {"remember", "understand", "apply", "analyze", "evaluate", "create"}
        valid_relations = {"prerequisite", "related", "contradicts"}

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
                "relation": e.get("relation") if e.get("relation") in valid_relations else "related",
                "strength": max(0.1, min(1.0, float(e.get("strength", 0.5)))),
            })

        return {"nodes": clean_nodes, "links": clean_links}

    def _calculate_layout(self, graph: Dict) -> Dict:
        """为图谱节点计算初始布局位置"""
        nodes = graph.get("nodes", [])
        if not nodes:
            return graph
        import math
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

    def _select_top_fragments(self, documents: List[Dict], top_k: int = 6, fragment_len: int = 500) -> List[str]:
        """从多份资料中选取 top-k 个最相关片段用于 LLM prompt

        评分规则：每个文档取首段（首 fragment_len 字符），并按文档标题与正文的 token 重叠度排序。
        这样 LLM 看到的资料更具代表性，且总输入 token 控制在 fragment_len × top_k 之内。
        """
        if not documents:
            return []

        # 提取每个文档的标题作为 query
        candidates = []
        for doc in documents:
            content = (doc.get("content") or "").strip()
            if not content:
                continue
            title = (doc.get("title") or "").strip()
            head = content[:fragment_len]
            # 评分：标题 token 在内容中出现的次数（粗略代表相关性）
            score = 0
            if title:
                title_tokens = [t for t in title if len(t) > 1] or [title]
                score = sum(1 for t in title_tokens if t in head)
            candidates.append((score, len(head), head))

        # 按相关分降序，长度降序（更长的片段通常更完整）
        candidates.sort(key=lambda x: (-x[0], -x[1]))
        return [c[2] for c in candidates[:top_k]]
