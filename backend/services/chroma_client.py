import os
import json
from typing import List, Dict, Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class ChromaClient:
    """ChromaDB 向量数据库客户端"""

    def __init__(self):
        self.chroma_dir = os.getenv("CHROMA_DIR", "./data/chroma")
        self._client = None
        self._collections: Dict[str, any] = {}

    def _ensure_client(self):
        """延迟初始化 ChromaDB 客户端"""
        if self._client is None:
            try:
                import chromadb
                Path(self.chroma_dir).mkdir(parents=True, exist_ok=True)
                self._client = chromadb.PersistentClient(path=self.chroma_dir)
                print(f"✅ ChromaDB 已连接: {self.chroma_dir}")
            except Exception as e:
                print(f"⚠️ ChromaDB 连接失败: {e}")
                self._client = False
        return self._client

    def get_collection(self, course_id: str):
        """获取或创建课程专属 collection"""
        if course_id not in self._collections:
            client = self._ensure_client()
            if client and client is not False:
                collection_name = f"course_{course_id}"
                try:
                    self._collections[course_id] = client.get_or_create_collection(
                        name=collection_name,
                        metadata={"course_id": course_id}
                    )
                except Exception as e:
                    print(f"⚠️ 创建 collection 失败: {e}")
                    self._collections[course_id] = None
            else:
                self._collections[course_id] = None
        return self._collections.get(course_id)

    async def add_documents(
        self,
        course_id: str,
        doc_ids: List[str],
        texts: List[str],
        embeddings: List[List[float]],
        metadata: Optional[List[Dict]] = None
    ):
        """添加文档到向量数据库"""
        collection = self.get_collection(course_id)
        if collection is None:
            print(f"⚠️ ChromaDB 不可用，跳过文档添加")
            return False

        try:
            collection.add(
                ids=doc_ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadata or [{}] * len(doc_ids)
            )
            print(f"✅ 已添加 {len(doc_ids)} 个文档到 ChromaDB")
            return True
        except Exception as e:
            print(f"⚠️ ChromaDB 添加文档失败: {e}")
            return False

    async def search(
        self,
        course_id: str,
        query_embedding: List[float],
        top_k: int = 5
    ) -> List[Dict]:
        """向量相似度检索"""
        collection = self.get_collection(course_id)
        if collection is None:
            return self._mock_search_results(top_k)

        try:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k
            )

            search_results = []
            if results and results.get("ids") and results["ids"][0]:
                for i, doc_id in enumerate(results["ids"][0]):
                    search_results.append({
                        "id": doc_id,
                        "content": results["documents"][0][i] if results.get("documents") else "",
                        "score": 1.0 - (results["distances"][0][i] if results.get("distances") else 0),
                        "metadata": results["metadatas"][0][i] if results.get("metadatas") else {}
                    })
            return search_results
        except Exception as e:
            print(f"⚠️ ChromaDB 检索失败: {e}")
            return self._mock_search_results(top_k)

    async def delete_course(self, course_id: str):
        """删除课程的所有向量数据"""
        collection = self.get_collection(course_id)
        if collection is None:
            return

        try:
            client = self._ensure_client()
            if client and client is not False:
                client.delete_collection(f"course_{course_id}")
            if course_id in self._collections:
                del self._collections[course_id]
        except Exception as e:
            print(f"⚠️ ChromaDB 删除 collection 失败: {e}")

    async def ping(self) -> bool:
        """检测 ChromaDB 连接状态"""
        client = self._ensure_client()
        if client and client is not False:
            try:
                client.list_collections()
                return True
            except Exception:
                pass
        return False

    def _mock_search_results(self, top_k: int) -> List[Dict]:
        """模拟搜索结果"""
        return [
            {
                "id": f"mock_doc_{i}",
                "content": f"这是模拟检索结果的示例内容（第{i+1}条）",
                "score": 1.0 - (i * 0.1),
                "metadata": {"source": "mock", "title": f"模拟文档{i+1}"}
            }
            for i in range(min(top_k, 3))
        ]
