import json
from typing import List, Dict, Optional

class GraphService:
    """知识图谱生成与管理"""

    def __init__(self, llm_service=None):
        self.llm = llm_service

    async def generate_graph(self, course_id: str, documents: List[Dict]) -> Dict:
        """生成知识图谱 — 无资料或LLM失败时返回空图谱"""
        if not documents:
            print(f"[graph] 课程 {course_id}: 无资料，跳过图谱生成")
            return {"nodes": [], "links": []}

        combined_text = "\n\n".join([doc.get("content", "")[:2000] for doc in documents[:5]])
        if not combined_text.strip():
            print(f"[graph] 课程 {course_id}: 资料内容为空")
            return {"nodes": [], "links": []}

        if not self.llm:
            print(f"[graph] 课程 {course_id}: LLM 服务不可用")
            return {"nodes": [], "links": []}

        prompt = f"""基于以下学习资料，生成一个知识图谱，包含核心概念及其关系。

学习资料：
{combined_text[:4000]}

请按布鲁姆认知分类（remember记忆、understand理解、apply应用、analyze分析、evaluate评价、create创造）为每个概念标注 bloom_level。
每个分类至少要有1-2个节点，确保六种分类都有覆盖。

请生成JSON（不要包含markdown代码块标记）：
{{
  "nodes": [
    {{"id": "c1", "name": "概念名", "description": "简短描述", "bloom_level": "remember", "difficulty": 0.3, "is_threshold_concept": false}}
  ],
  "links": [
    {{"source": "c1", "target": "c2", "relation": "prerequisite", "strength": 0.8}}
  ]
}}

bloom_level 必须是以下六者之一：remember / understand / apply / analyze / evaluate / create
relation 可选值：prerequisite（前置依赖）、related（相关）、contradicts（矛盾）"""

        print(f"[graph] 课程 {course_id}: 开始调用 LLM 生成图谱，资料长度={len(combined_text)}，文档数={len(documents)}")
        result = await self.llm.chat_json(prompt, temperature=0.3, max_tokens=4096)

        if result and isinstance(result.get("nodes"), list) and len(result["nodes"]) > 0:
            validated = self._validate_graph(result)
            print(f"[graph] 课程 {course_id}: 图谱节点={len(validated['nodes'])}，链接={len(validated['links'])}")
            return self._calculate_layout(validated)

        print(f"[graph] 课程 {course_id}: LLM 未返回有效图谱节点")
        return {"nodes": [], "links": []}

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
            clean_nodes.append({
                "id": nid,
                "name": str(n.get("name", nid)),
                "description": str(n.get("description", ""))[:200],
                "bloom_level": n.get("bloom_level") if n.get("bloom_level") in valid_bloom else "understand",
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
