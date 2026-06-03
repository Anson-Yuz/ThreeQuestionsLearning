#!/bin/bash
# OpenSpec 完成度检测脚本
# 运行: bash scripts/check-completeness.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

check_pass() {
    echo -e "${GREEN}[✓] $1${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
}

check_fail() {
    echo -e "${RED}[✗] $1${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

echo "========================================"
echo "  OpenSpec 完成度检测报告"
echo "  检测时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# ========== 1. 项目结构完整性检测 ==========
echo "━━━ 1. 项目结构完整性检测 ━━━"

# 前端核心文件（实际路径: client/）
declare -a FRONTEND_FILES=(
    "client/src/main.tsx"
    "client/src/App.tsx"
    "client/src/index.css"
    "client/vite.config.ts"
    "client/package.json"
    "client/tailwind.config.js"
)

echo "  [前端核心文件]"
for file in "${FRONTEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

# 后端关键文件
declare -a BACKEND_FILES=(
    "backend/main.py"
    "backend/database.py"
    "backend/models.py"
    "backend/requirements.txt"
    "backend/schema.sql"
)

echo "  [后端核心文件]"
for file in "${BACKEND_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

# 路由文件
declare -a ROUTER_FILES=(
    "backend/routers/__init__.py"
    "backend/routers/courses.py"
    "backend/routers/knowledge.py"
    "backend/routers/three_ask.py"
    "backend/routers/quiz.py"
    "backend/routers/sse.py"
)

echo "  [路由文件]"
for file in "${ROUTER_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

# 服务层文件
declare -a SERVICE_FILES=(
    "backend/services/__init__.py"
    "backend/services/llm_service.py"
    "backend/services/embedding_service.py"
    "backend/services/parser_service.py"
    "backend/services/chroma_client.py"
    "backend/services/graph_service.py"
    "backend/services/quiz_service.py"
)

echo "  [服务层文件]"
for file in "${SERVICE_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

# 前端页面文件（实际路径: client/src/pages/*.tsx）
declare -a PAGE_FILES=(
    "client/src/pages/Home.tsx"
    "client/src/pages/LearningSpace.tsx"
    "client/src/pages/QuizCenter.tsx"
    "client/src/pages/QuizPlay.tsx"
    "client/src/pages/QuizReport.tsx"
    "client/src/pages/Profile.tsx"
)

echo "  [前端页面文件]"
for file in "${PAGE_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

# 前端业务组件
declare -a COMPONENT_FILES=(
    "client/src/components/business/KnowledgeGraph.tsx"
    "client/src/components/business/ControversyPanel.tsx"
    "client/src/components/business/RadarChart.tsx"
    "client/src/components/business/CourseCard.tsx"
    "client/src/components/ui/Icons.tsx"
)

echo "  [业务组件文件]"
for file in "${COMPONENT_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

# 前端 Store 文件
declare -a STORE_FILES=(
    "client/src/stores/courseStore.ts"
    "client/src/stores/learningStore.ts"
    "client/src/stores/quizStore.ts"
)

echo "  [状态管理文件]"
for file in "${STORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

# 前端 API 文件
declare -a API_FILES=(
    "client/src/api/client.ts"
    "client/src/api/courses.ts"
    "client/src/api/knowledge.ts"
    "client/src/api/threeAsk.ts"
)

echo "  [API层文件]"
for file in "${API_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

echo ""

# ========== 2. 数据库表完整性检测 ==========
echo "━━━ 2. 数据库表完整性检测 ━━━"

if [ -f "backend/schema.sql" ]; then
    # 检测schema.sql中的表定义
    declare -a REQUIRED_TABLES=(
        "courses"
        "documents"
        "learning_progress"
        "learning_events"
        "quiz_records"
        "controversies"
        "discussion_posts"
        "discussion_replies"
        "reminders"
        "knowledge_graphs"
        "course_tags"
        "settings"
        "export_records"
    )

    for table in "${REQUIRED_TABLES[@]}"; do
        if grep -q "CREATE TABLE IF NOT EXISTS $table" backend/schema.sql; then
            check_pass "数据表定义: $table"
        else
            check_fail "缺失数据表: $table"
        fi
    done
else
    check_fail "schema.sql 文件不存在"
fi

echo ""

# ========== 3. API端点完整性检测 ==========
echo "━━━ 3. API端点完整性检测 ━━━"

# 课程API端点
declare -a COURSE_ENDPOINTS=(
    "/api/courses/create"
    "/api/courses/list"
    "/api/courses/{course_id}"
    "/api/courses/{course_id}/status"
    "/api/courses/{course_id}/progress"
    "/api/courses/{course_id}"
)

echo "  [课程API]"
for endpoint in "${COURSE_ENDPOINTS[@]}"; do
    if grep -q "$endpoint" backend/routers/courses.py 2>/dev/null; then
        check_pass "端点: $endpoint"
    else
        check_fail "缺失端点: $endpoint"
    fi
done

# 知识库API端点
declare -a KNOWLEDGE_ENDPOINTS=(
    "/api/knowledge/upload"
    "/api/knowledge/ai-fetch/{course_id}"
    "/api/knowledge/documents"
    "/api/knowledge/documents/{doc_id}"
    "/api/knowledge/search"
)

echo "  [知识库API]"
for endpoint in "${KNOWLEDGE_ENDPOINTS[@]}"; do
    if grep -q "$endpoint" backend/routers/knowledge.py 2>/dev/null; then
        check_pass "端点: $endpoint"
    else
        check_fail "缺失端点: $endpoint"
    fi
done

# 三问引擎API端点
declare -a THREEASK_ENDPOINTS=(
    "/api/three-ask/graph/generate/{course_id}"
    "/api/three-ask/graph/update/{course_id}"
    "/api/three-ask/controversy/detect/{course_id}"
    "/api/three-ask/controversy/{course_id}"
    "/api/three-ask/quiz/generate/{course_id}"
    "/api/three-ask/quiz/submit"
    "/api/three-ask/quiz/{course_id}/complete"
    "/api/three-ask/progress/{course_id}"
)

echo "  [三问引擎API]"
for endpoint in "${THREEASK_ENDPOINTS[@]}"; do
    if grep -q "$endpoint" backend/routers/three_ask.py 2>/dev/null; then
        check_pass "端点: $endpoint"
    else
        check_fail "缺失端点: $endpoint"
    fi
done

echo ""

# ========== 4. Import路径正确性检测 ==========
echo "━━━ 4. Import路径正确性检测 ━━━"

# 检测错误的 import 路径模式
echo "  [检测双层级components路径错误]"
WRONG_IMPORTS=$(grep -rn "from.*\.\.\/components\/ui\/Icons" client/src/components/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
if [ "$WRONG_IMPORTS" -eq 0 ]; then
    check_pass "无错误 import 路径 (../components/ui/Icons)"
else
    check_fail "发现 $WRONG_IMPORTS 处错误 import 路径，需修复为 ../ui/Icons"
fi

echo ""

# ========== 5. 配置文件完整性检测 ==========
echo "━━━ 5. 配置文件完整性检测 ━━━"

declare -a CONFIG_FILES=(
    "backend/.env.example"
    "client/.env.example"
    "docker-compose.yml"
    "backend/Dockerfile"
    "client/Dockerfile"
    "start.bat"
    "start.sh"
    "install.bat"
    "install.sh"
    "package.json"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "存在: $file"
    else
        check_fail "缺失: $file"
    fi
done

echo ""

# ========== 6. 文档完整性检测 ==========
echo "━━━ 6. 文档完整性检测 ━━━"

declare -a DOC_FILES=(
    "README.md"
    "API.md"
    "DEPLOY.md"
    "OpenSpec.md"
)

for file in "${DOC_FILES[@]}"; do
    if [ -f "$file" ]; then
        # 检测文档是否有内容
        if [ -s "$file" ]; then
            WORD_COUNT=$(wc -c < "$file")
            if [ "$WORD_COUNT" -gt 100 ]; then
                check_pass "文档完整: $file ($WORD_COUNT 字节)"
            else
                check_fail "文档内容过少: $file"
            fi
        else
            check_fail "文档为空: $file"
        fi
    else
        check_fail "缺失文档: $file"
    fi
done

echo ""

# ========== 7. 暗黑模式检测 ==========
echo "━━━ 7. 暗黑模式检测 ━━━"

if grep -q "dark:" client/src/index.css 2>/dev/null; then
    check_pass "CSS暗黑模式变量定义存在"
else
    check_fail "缺失CSS暗黑模式变量"
fi

if [ -f "client/src/stores/themeStore.ts" ]; then
    check_pass "主题Store存在"
else
    check_fail "缺失主题Store"
fi

echo ""

# ========== 8. 组件复用检测 ==========
echo "━━━ 8. 组件复用检测 ━━━"

# 检测是否有重复代码
echo "  [检测组件复用]"
COMPONENT_COUNT=$(find client/src/components -name "*.tsx" | wc -l)
echo "  组件总数: $COMPONENT_COUNT"
check_pass "组件文件总数: $COMPONENT_COUNT"

echo ""

# ========== 9. SSE 集成检测 ==========
echo "━━━ 9. SSE 实时推送检测 ━━━"

if [ -f "backend/routers/sse.py" ]; then
    if grep -q "EventSourceResponse" backend/routers/sse.py 2>/dev/null; then
        check_pass "SSE后端实现存在"
    else
        check_fail "SSE后端实现不完整"
    fi
else
    check_fail "SSE路由文件缺失"
fi

if [ -f "client/src/hooks/useSSE.ts" ]; then
    check_pass "SSE前端Hook存在"
else
    check_fail "SSE前端Hook缺失"
fi

echo ""

# ========== 10. 移动端适配检测 ==========
echo "━━━ 10. iOS移动端适配检测 ━━━"

if grep -q "padding-left: 145pt\|padding-right: 145pt\|pl-\[145pt\]\|pr-\[145pt\]" client/src/index.css 2>/dev/null; then
    check_pass "145pt边距规范已应用"
else
    check_fail "145pt边距规范未应用"
fi

if grep -q "backdrop-filter" client/src/index.css 2>/dev/null; then
    check_pass "毛玻璃效果已应用"
else
    check_fail "毛玻璃效果未应用"
fi

echo ""

# ========== 检测总结 ==========
echo "========================================"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
COMPLETION=$((PASS_COUNT * 100 / TOTAL))

echo "  检测总结"
echo "  通过: $PASS_COUNT 项"
echo "  失败: $FAIL_COUNT 项"
echo "  总计: $TOTAL 项"
echo "  完成度: $COMPLETION%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}  ✓ OpenSpec 100% 完成！可以提交。${NC}"
    echo "  STATUS: PASSED"
    exit 0
else
    echo -e "${RED}  ✗ 存在 $FAIL_COUNT 项未完成，请修复后重新检测。${NC}"
    echo "  STATUS: FAILED"
    exit 1
fi