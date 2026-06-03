import os
from pathlib import Path
from typing import Optional, Dict

class ParserService:
    """文件解析服务（PDF/Word/Markdown/TXT）"""

    SUPPORTED_EXTENSIONS = {
        ".pdf": "PDF文档",
        ".doc": "Word文档",
        ".docx": "Word文档",
        ".md": "Markdown",
        ".txt": "纯文本"
    }

    async def parse(self, file_path: str) -> Dict:
        """解析文件，返回文本内容和元数据"""
        path = Path(file_path)

        if not path.exists():
            return {"error": f"文件不存在: {file_path}", "content": "", "metadata": {}}

        ext = path.suffix.lower()

        if ext == ".pdf":
            content = await self._parse_pdf(file_path)
        elif ext in (".doc", ".docx"):
            content = await self._parse_docx(file_path)
        elif ext == ".md":
            content = await self._parse_markdown(file_path)
        elif ext == ".txt":
            content = await self._parse_txt(file_path)
        else:
            return {"error": f"不支持的文件类型: {ext}", "content": "", "metadata": {}}

        return {
            "content": content,
            "metadata": {
                "file_name": path.name,
                "file_type": self.SUPPORTED_EXTENSIONS.get(ext, "未知"),
                "file_size": path.stat().st_size,
                "char_count": len(content)
            }
        }

    async def _parse_pdf(self, file_path: str) -> str:
        """解析 PDF 文件"""
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            texts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    texts.append(text)
            return "\n\n".join(texts)
        except Exception as e:
            return f"PDF解析失败: {e}"

    async def _parse_docx(self, file_path: str) -> str:
        """解析 Word 文档"""
        try:
            from docx import Document
            doc = Document(file_path)
            texts = [para.text for para in doc.paragraphs if para.text.strip()]
            return "\n\n".join(texts)
        except Exception as e:
            return f"Word文档解析失败: {e}"

    async def _parse_markdown(self, file_path: str) -> str:
        """解析 Markdown 文件"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="gbk") as f:
                return f.read()

    async def _parse_txt(self, file_path: str) -> str:
        """解析纯文本文件"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="gbk") as f:
                return f.read()

    def extract_summary(self, content: str, max_length: int = 200) -> str:
        """提取文本摘要"""
        cleaned = content.strip().replace("\n", " ")[:max_length]
        return cleaned + ("..." if len(content) > max_length else "")
