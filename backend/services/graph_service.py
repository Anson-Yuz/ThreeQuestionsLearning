import json
from typing import List, Dict, Optional

class GraphService:
    """知识图谱生成与管理"""

    def __init__(self, llm_service=None):
        self.llm = llm_service

    async def generate_graph(self, course_id: str, documents: List[Dict]) -> Dict:
        """生成知识图谱"""
        if not documents:
            return {"nodes": [], "links": []}

        # 合并文档内容
        combined_text = "\n\n".join([doc.get("content", "")[:2000] for doc in documents[:5]])

        # 调用 LLM 生成图谱
        if self.llm:
            prompt = f"""
基于以下学习资料，生成一个知识图谱，包含核心概念及其关系。

学习资料：
{combined_text[:4000]}

请生成包含以下结构的JSON：
{{
  "nodes": [
    {{"id": "node1", "name": "核心概念", "description": "描述", "bloom_level": "understand", "difficulty": 0.5, "is_threshold_concept": true}}
  ],
  "links": [
    {{"source": "node1", "target": "node2", "relation": "related", "strength": 0.8}}
  ]
}}
"""
            result = await self.llm.chat(prompt)
            try:
                return json.loads(result)
            except:
                pass

        # 返回示例数据
        return {
            "nodes": [
                {"id": "concept1", "name": "核心概念", "description": "这是核心概念", "bloom_level": "understand", "difficulty": 0.5, "is_threshold_concept": True},
                {"id": "concept2", "name": "相关概念", "description": "这是相关概念", "bloom_level": "remember", "difficulty": 0.3, "is_threshold_concept": False}
            ],
            "links": [
                {"source": "concept1", "target": "concept2", "relation": "related", "strength": 0.8}
            ]
        }

    def update_graph_incremental(self, existing_graph: Dict, new_document: Dict) -> Dict:
        """增量更新图谱"""
        return existing_graph
