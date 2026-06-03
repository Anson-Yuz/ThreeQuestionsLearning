-- 三问高效学习机 - 数据库表结构
-- SQLite Schema

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    keywords TEXT,
    original_question TEXT,
    status TEXT DEFAULT 'active',
    created_at INTEGER,
    updated_at INTEGER
);

-- 资料表
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    file_path TEXT,
    file_type TEXT,
    source TEXT,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 学习进度表
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
);

-- 学习事件表
CREATE TABLE IF NOT EXISTS learning_events (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    event_type TEXT,
    duration INTEGER,
    metadata TEXT,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 测评记录表
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
);

-- 争议点表
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
);

-- 讨论帖子表
CREATE TABLE IF NOT EXISTS discussion_posts (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    controversy_id TEXT,
    content TEXT NOT NULL,
    author TEXT DEFAULT '用户',
    likes INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 讨论回复表
CREATE TABLE IF NOT EXISTS discussion_replies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT DEFAULT '用户',
    created_at INTEGER,
    FOREIGN KEY (post_id) REFERENCES discussion_posts(id)
);

-- 提醒表
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    type TEXT,
    title TEXT,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 知识图谱缓存表
CREATE TABLE IF NOT EXISTS knowledge_graphs (
    course_id TEXT PRIMARY KEY,
    graph_data TEXT,
    updated_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 课程标签表
CREATE TABLE IF NOT EXISTS course_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 导出记录表
CREATE TABLE IF NOT EXISTS export_records (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    format TEXT,
    file_path TEXT,
    created_at INTEGER,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);
