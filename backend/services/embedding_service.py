import os
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

class EmbeddingService:
    """文本向量化服务"""

    def __init__(self):
        self.model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-zh-v1.5")
        self.dimension = int(os.getenv("EMBEDDING_DIMENSION", "1024"))
        self._model = None

    def _load_model(self):
        """延迟加载模型"""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                print(f"✅ Embedding 模型已加载: {self.model_name}")
            except Exception as e:
                print(f"⚠️ Embedding 模型加载失败: {e}，使用模拟模式")
                self._model = False
        return self._model

    async def embed(self, text: str) -> List[float]:
        """将文本向量化"""
        model = self._load_model()

        if model and model is not False:
            embedding = model.encode(text, normalize_embeddings=True)
            return embedding.tolist()

        # 模拟向量
        import hashlib
        hash_bytes = hashlib.sha256(text.encode()).digest()
        vector = [(b / 255.0) for b in hash_bytes[:self.dimension]]
        while len(vector) < self.dimension:
            vector.extend([0.0] * min(128, self.dimension - len(vector)))
        return vector[:self.dimension]

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """批量向量化"""
        embeddings = []
        for text in texts:
            embeddings.append(await self.embed(text))
        return embeddings
