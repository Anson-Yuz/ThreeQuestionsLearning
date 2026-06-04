import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime

# 数据库路径
DATA_DIR = Path("./data")
DB_PATH = DATA_DIR / "courses.db"

def ensure_data_dir():
    """确保数据目录存在"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "uploads").mkdir(exist_ok=True)
    (DATA_DIR / "chroma").mkdir(exist_ok=True)

@contextmanager
def get_db():
    """获取数据库连接（上下文管理器）"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def _safe_add_column(conn, table: str, column: str, col_type: str):
    """安全添加列 — 使用 PRAGMA 检查避免重复报错"""
    cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")

def init_db():
    """初始化数据库：创建所有表"""
    ensure_data_dir()

    with get_db() as conn:
        # 课程表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                keywords TEXT,
                original_question TEXT,
                status TEXT DEFAULT 'active',
                created_at INTEGER,
                updated_at INTEGER
            )
        """)

        # 资料表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                title TEXT,
                content TEXT,
                file_path TEXT,
                file_type TEXT,
                source TEXT,
                source_url TEXT,
                source_type TEXT DEFAULT 'user_upload',
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 安全添加列（如果表已存在但缺少新列）
        _safe_add_column(conn, "documents", "source_url", "TEXT")
        _safe_add_column(conn, "documents", "source_type", "TEXT DEFAULT 'user_upload'")

        # 搜索缓存表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS search_cache (
                course_id TEXT PRIMARY KEY,
                results TEXT,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 学习进度表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS learning_progress (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                q1_completed INTEGER DEFAULT 0,
                q2_completed INTEGER DEFAULT 0,
                q3_completed INTEGER DEFAULT 0,
                q3_score REAL,
                ability_remember REAL DEFAULT 0,
                ability_understand REAL DEFAULT 0,
                ability_apply REAL DEFAULT 0,
                ability_analyze REAL DEFAULT 0,
                ability_evaluate REAL DEFAULT 0,
                ability_create REAL DEFAULT 0,
                total_minutes INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                last_activity INTEGER,
                overall_progress INTEGER DEFAULT 0,
                created_at INTEGER,
                updated_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 学习事件表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS learning_events (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                event_type TEXT,
                duration INTEGER,
                metadata TEXT,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 测评记录表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quiz_records (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                question_id TEXT,
                user_answer TEXT,
                is_correct INTEGER,
                score REAL,
                dimension TEXT,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 争议点表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS controversies (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                pro_view TEXT,
                pro_evidence TEXT,
                con_view TEXT,
                con_evidence TEXT,
                confidence REAL,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 讨论帖子表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS discussion_posts (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                controversy_id TEXT,
                content TEXT NOT NULL,
                author TEXT DEFAULT '用户',
                likes INTEGER DEFAULT 0,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 讨论回复表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS discussion_replies (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                content TEXT NOT NULL,
                author TEXT DEFAULT '用户',
                created_at INTEGER,
                FOREIGN KEY (post_id) REFERENCES discussion_posts(id)
            )
        """)

        # 提醒表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                type TEXT,
                title TEXT,
                content TEXT,
                is_read INTEGER DEFAULT 0,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 知识图谱缓存表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_graphs (
                course_id TEXT PRIMARY KEY,
                graph_data TEXT,
                updated_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 课程标签表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS course_tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT
            )
        """)

        # 设置表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)

        # 导出记录表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS export_records (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                format TEXT,
                file_path TEXT,
                created_at INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )
        """)

        # 课程全文索引（FTS5）— 用于快速关键词搜索
        try:
            conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS courses_fts USING fts5(
                    course_id UNINDEXED,
                    title,
                    description,
                    content,
                    tokenize='unicode61'
                )
            """)
        except Exception as e:
            print(f"⚠️ FTS5 不可用（{e}），将回退到 LIKE 搜索")

        conn.commit()
        print("✅ 数据库初始化完成")

        # 启动时回填 FTS（覆盖已有课程）
        backfill_fts()


def update_fts(course_id: str, title: str, description: str, full_text: str):
    """同步课程到 FTS5 索引。失败时静默忽略。"""
    try:
        with get_db() as conn:
            conn.execute("DELETE FROM courses_fts WHERE course_id = ?", (course_id,))
            conn.execute(
                "INSERT INTO courses_fts(course_id, title, description, content) VALUES (?, ?, ?, ?)",
                (course_id, title or "", description or "", (full_text or "")[:100000])
            )
            conn.commit()
    except Exception as e:
        print(f"⚠️ FTS 同步失败 {course_id}: {e}")


def remove_fts(course_id: str):
    """从 FTS 索引中移除课程。"""
    try:
        with get_db() as conn:
            conn.execute("DELETE FROM courses_fts WHERE course_id = ?", (course_id,))
            conn.commit()
    except Exception as e:
        print(f"⚠️ FTS 删除失败 {course_id}: {e}")


def backfill_fts():
    """全量回填 FTS 索引 — 用于初始化时把已有课程导入。"""
    try:
        with get_db() as conn:
            rows = conn.execute(
                "SELECT c.id, c.title, c.original_question, "
                "GROUP_CONCAT(COALESCE(d.title, '') || ' ' || COALESCE(d.content, ''), ' ') AS full_text "
                "FROM courses c LEFT JOIN documents d ON d.course_id = c.id "
                "WHERE c.status != 'deleted' GROUP BY c.id"
            ).fetchall()
        for r in rows:
            update_fts(r["id"], r["title"] or "", r["original_question"] or "", r["full_text"] or "")
        print(f"✅ FTS 回填完成: {len(rows)} 门课程")
    except Exception as e:
        print(f"⚠️ FTS 回填失败: {e}")


def rebuild_course_fts(course_id: str):
    """重新构建单门课程的 FTS 索引（资料变更后调用）。"""
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT title, original_question FROM courses WHERE id = ?",
                (course_id,)
            ).fetchone()
            if not row:
                remove_fts(course_id)
                return
            full_text_row = conn.execute(
                "SELECT GROUP_CONCAT(COALESCE(title, '') || ' ' || COALESCE(content, ''), ' ') AS ft "
                "FROM documents WHERE course_id = ?",
                (course_id,)
            ).fetchone()
            full_text = full_text_row["ft"] if full_text_row else ""
            update_fts(course_id, row["title"] or "", row["original_question"] or "", full_text or "")
    except Exception as e:
        print(f"⚠️ 单门课程 FTS 重建失败 {course_id}: {e}")

# 初始化数据库
if __name__ == "__main__":
    init_db()
