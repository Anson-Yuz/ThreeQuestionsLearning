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

请生成包含以下结构的JSON（不要包含markdown代码块标记）：
{{
  "nodes": [
    {{"id": "node1", "name": "核心概念", "description": "描述", "bloom_level": "understand", "difficulty": 0.5, "is_threshold_concept": true}}
  ],
  "links": [
    {{"source": "node1", "target": "node2", "relation": "related", "strength": 0.8}}
  ]
}}"""

        print(f"[graph] 课程 {course_id}: 开始调用 LLM 生成图谱，资料长度={len(combined_text)}，文档数={len(documents)}")
        result = await self.llm.chat_json(prompt, temperature=0.3, max_tokens=4096)

        if result and isinstance(result.get("nodes"), list) and len(result["nodes"]) > 0:
            print(f"[graph] 课程 {course_id}: 图谱生成成功，节点数={len(result['nodes'])}，链接数={len(result.get('links', []))}")
            return self._calculate_layout(result)

        print(f"[graph] 课程 {course_id}: LLM 未返回有效图谱节点")
        return {"nodes": [], "links": []}

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
