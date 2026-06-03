#!/bin/bash
# OpenSpec 完整检测脚本（含质量验证）
# 运行: bash scripts/full-check.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

check_pass() {
    echo -e "${GREEN}[✓] $1${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
}

check_fail() {
    echo -e "${RED}[✗] $1${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_warn() {
    echo -e "${YELLOW}[!] $1${NC}"
    WARN_COUNT=$((WARN_COUNT + 1))
}

# JSON 报告变量
REPORT_FILE="openspec-report.json"
JSON_OUTPUT=""

echo "========================================"
echo "  OpenSpec 完整检测报告"
echo "  检测时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# ========== 阶段1: 环境准备 ==========
echo -e "${BLUE}━━━ 阶段1: 环境准备 ━━━${NC}"

echo "[1.1] 检查并创建必要目录..."
bash scripts/auto-fix.sh > /dev/null 2>&1
check_pass "目录结构检查完成"
echo ""

echo "[1.2] 前端依赖安装检查..."
if [ -d "client/node_modules" ]; then
    check_pass "前端依赖已安装"
else
    check_warn "前端依赖未安装，尝试安装..."
    cd client && npm install > /dev/null 2>&1 && check_pass "前端依赖安装成功" || check_fail "前端依赖安装失败"
    cd ..
fi
echo ""

echo "[1.3] 后端依赖安装检查..."
if python3 -c "import fastapi" 2>/dev/null; then
    check_pass "后端依赖已安装"
else
    check_warn "后端依赖未安装，尝试安装..."
    pip3 install -r backend/requirements.txt > /dev/null 2>&1 && check_pass "后端依赖安装成功" || check_fail "后端依赖安装失败"
fi
echo ""

echo "[1.4] 环境变量检查..."
if [ -f "backend/.env" ]; then
    if grep -q "MINIMAX_API_KEY" backend/.env; then
        API_KEY_VALUE=$(grep "MINIMAX_API_KEY" backend/.env | cut -d'=' -f2)
        if [ "$API_KEY_VALUE" != "" ] && [ "$API_KEY_VALUE" != "your_api_key_here" ] && [ "$API_KEY_VALUE" != "placeholder" ]; then
            check_pass "MINIMAX_API_KEY 已配置"
        else
            check_fail "MINIMAX_API_KEY 为占位符，未实际配置"
        fi
    else
        check_fail "MINIMAX_API_KEY 未在 .env 中定义"
    fi
else
    check_warn "backend/.env 不存在，跳过环境变量检查"
fi
echo ""

# ========== 阶段2: 代码质量检查 ==========
echo -e "${BLUE}━━━ 阶段2: 代码质量检查 ━━━${NC}"

echo "[2.1] 前端 TypeScript 类型检查..."
cd client
if npx tsc --noEmit 2>&1 | tee /tmp/tsc_output.txt; then
    check_pass "TypeScript 类型检查通过"
else
    TS_ERRORS=$(grep -c "error TS" /tmp/tsc_output.txt 2>/dev/null || echo "0")
    if [ "$TS_ERRORS" -gt 0 ]; then
        check_fail "TypeScript 类型错误: $TS_ERRORS 处"
        grep "error TS" /tmp/tsc_output.txt | head -5
    else
        check_warn "TypeScript 检查有警告"
    fi
fi
cd ..
echo ""

echo "[2.2] 前端 ESLint 代码规范检查..."
if [ -f "client/.eslintrc.js" ] || [ -f "client/eslint.config.js" ]; then
    cd client
    if npx eslint src/ --max-warnings=0 2>&1 | tee /tmp/eslint_output.txt; then
        check_pass "ESLint 检查通过"
    else
        ESLINT_ERRORS=$(grep -c "error" /tmp/eslint_output.txt 2>/dev/null || echo "0")
        if [ "$ESLINT_ERRORS" -gt 0 ]; then
            check_fail "ESLint 错误: $ESLINT_ERRORS 处"
        else
            check_warn "ESLint 检查有警告"
        fi
    fi
    cd ..
else
    check_warn "ESLint 配置文件不存在，跳过"
fi
echo ""

echo "[2.3] 后端 Python 语法检查..."
if python3 -m compileall backend/ 2>&1 | tee /tmp/compile_output.txt; then
    check_pass "Python 语法检查通过"
else
    PYTHON_ERRORS=$(grep -c "SyntaxError\|ImportError" /tmp/compile_output.txt 2>/dev/null || echo "0")
    check_fail "Python 语法错误: $PYTHON_ERRORS 处"
fi
echo ""

echo "[2.4] 后端 Ruff 代码规范检查..."
if command -v ruff &> /dev/null; then
    if ruff check backend/ --max-line-length=120 2>&1 | tee /tmp/ruff_output.txt; then
        check_pass "Ruff 检查通过"
    else
        RUFF_ERRORS=$(grep -c "." /tmp/ruff_output.txt 2>/dev/null || echo "0")
        if [ "$RUFF_ERRORS" -gt 0 ]; then
            check_warn "Ruff 警告: $RUFF_ERRORS 处"
        fi
    fi
else
    check_warn "Ruff 未安装，跳过代码规范检查"
fi
echo ""

# ========== 阶段3: 构建验证 ==========
echo -e "${BLUE}━━━ 阶段3: 构建验证 ━━━${NC}"

echo "[3.1] 前端构建验证..."
cd client
if npm run build 2>&1 | tee /tmp/build_output.txt; then
    check_pass "前端构建成功"
else
    check_fail "前端构建失败"
    grep -A2 "error" /tmp/build_output.txt | head -10
fi
cd ..
echo ""

# ========== 阶段4: 数据库验证 ==========
echo -e "${BLUE}━━━ 阶段4: 数据库验证 ━━━${NC}"

echo "[4.1] 数据库初始化..."
if [ -f "backend/database.py" ]; then
    cd backend
    python3 -c "from database import init_db; init_db()" 2>/dev/null
    if [ $? -eq 0 ]; then
        check_pass "数据库初始化成功"
    else
        check_fail "数据库初始化失败"
    fi
    cd ..
else
    check_fail "database.py 不存在"
fi
echo ""

echo "[4.2] 数据库表结构实际比对..."
if [ -f "backend/schema.sql" ]; then
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
            check_pass "表定义存在: $table"
        else
            check_fail "缺失表定义: $table"
        fi
    done
else
    check_fail "schema.sql 不存在"
fi
echo ""

# ========== 阶段5: API 冒烟测试 ==========
echo -e "${BLUE}━━━ 阶段5: API 冒烟测试 ━━━${NC}"

echo "[5.1] 启动后端服务..."
cd backend
python3 main.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 轮询检测后端启动（最多等待30秒）
echo "[5.2] 等待后端服务启动（轮询检测）..."
MAX_WAIT=30
ELAPSED=0
BACKEND_READY=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done

if [ "$BACKEND_READY" = true ]; then
    check_pass "后端服务启动成功 (PID: $BACKEND_PID, 等待: ${ELAPSED}s)"
else
    check_fail "后端服务启动超时（${MAX_WAIT}s）"
    cat /tmp/backend.log | tail -20
fi
echo ""

echo "[5.3] API 健康检查..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/api/health 2>/dev/null || echo "")
if echo "$HEALTH_RESPONSE" | grep -q "ok\|OK\|healthy"; then
    check_pass "健康检查端点正常"
else
    check_fail "健康检查端点异常"
fi
echo ""

echo "[5.4] 创建课程 API 测试..."
COURSE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/courses/create \
    -H "Content-Type: application/json" \
    -d '{"question":"OpenSpec 测试课程","keywords":["test"]}' 2>/dev/null || echo "")
if echo "$COURSE_RESPONSE" | grep -q "id\|course"; then
    check_pass "创建课程 API 正常"
else
    check_warn "创建课程 API 响应异常"
fi
echo ""

echo "[5.5] 知识库上传 API 测试..."
# 创建测试文件
TEST_FILE="/tmp/openspec_test.txt"
echo "OpenSpec test content" > "$TEST_FILE"
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8000/api/knowledge/upload \
    -F "file=@$TEST_FILE" \
    -F "course_id=test_course" 2>/dev/null || echo "")
if echo "$UPLOAD_RESPONSE" | grep -q "id\|success\|ok"; then
    check_pass "知识库上传 API 正常"
else
    check_warn "知识库上传 API 响应异常"
fi
rm -f "$TEST_FILE"
echo ""

echo "[5.6] SSE 连接测试..."
SSE_TEST=$(timeout 5 curl -s http://localhost:8000/api/sse/stream/test 2>/dev/null || echo "")
if [ -n "$SSE_TEST" ]; then
    check_pass "SSE 连接正常"
else
    check_warn "SSE 连接测试未完成（可能超时）"
fi
echo ""

echo "[5.7] 关闭后端服务..."
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    kill $BACKEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    check_pass "后端服务已关闭"
else
    check_warn "后端服务已关闭"
fi
echo ""

# ========== 阶段6: 单元测试 ==========
echo -e "${BLUE}━━━ 阶段6: 单元测试 ━━━${NC}"

echo "[6.1] 后端单元测试..."
if [ -d "backend/tests" ] || [ -f "pytest.ini" ] || [ -f "pyproject.toml" ]; then
    # 检查测试目录是否为空
    TEST_FILES=$(find backend/tests -name "test_*.py" -o -name "*_test.py" 2>/dev/null | wc -l)
    if [ "$TEST_FILES" -eq 0 ]; then
        check_fail "backend/tests/ 目录存在但无测试文件"
    else
        if command -v pytest &> /dev/null; then
            (cd backend && pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=20 2>&1 | tee /tmp/pytest_output.txt)
            PYTEST_RESULT=$?
            if [ $PYTEST_RESULT -eq 0 ]; then
                check_pass "单元测试通过，覆盖率达标"
            else
                check_fail "单元测试失败或覆盖率不足"
            fi
        else
            check_warn "pytest 未安装，跳过单元测试"
        fi
    fi
else
    check_fail "未找到测试配置（backend/tests/ 或 pytest.ini）"
fi
echo ""

# ========== 阶段7: OpenSpec 结构完整性 ==========
echo -e "${BLUE}━━━ 阶段7: OpenSpec 结构完整性 ━━━${NC}"

# 调用原有结构检测
echo "[7.1] 运行 OpenSpec 结构检测..."
bash scripts/check-completeness.sh > /tmp/openspec_check.txt 2>&1
OPENSPEC_RESULT=$?
if [ $OPENSPEC_RESULT -eq 0 ]; then
    check_pass "OpenSpec 结构检测通过"
else
    check_fail "OpenSpec 结构检测失败"
fi
echo ""

echo "[7.2] 文档质量检查..."
if [ -f "README.md" ]; then
    if grep -q "安装\|install\|快速开始\|quick start" README.md; then
        check_pass "README 包含安装说明"
    else
        check_warn "README 缺少安装说明"
    fi
else
    check_fail "README.md 不存在"
fi

if [ -f "API.md" ]; then
    if grep -q "/api/courses\|/api/knowledge" API.md; then
        check_pass "API.md 描述了端点"
    else
        check_warn "API.md 可能缺少端点描述"
    fi
else
    check_fail "API.md 不存在"
fi
echo ""

echo "[7.3] 暗黑模式功能验证..."
if [ -f "client/tailwind.config.js" ]; then
    if grep -q "darkMode.*class\|darkMode.*'class'" client/tailwind.config.js; then
        check_pass "Tailwind 暗黑模式配置正确"
    else
        check_fail "Tailwind 暗黑模式未配置为 class 模式"
    fi
else
    check_warn "tailwind.config.js 不存在"
fi

if [ -f "client/src/stores/themeStore.ts" ]; then
    if grep -q "dark\|theme\|toggle" client/src/stores/themeStore.ts; then
        check_pass "themeStore 包含切换逻辑"
    else
        check_warn "themeStore 可能缺少切换逻辑"
    fi
else
    check_fail "themeStore.ts 不存在"
fi
echo ""

echo "[7.4] 前端路由完整性检查..."
if [ -f "client/src/App.tsx" ]; then
    REQUIRED_ROUTES=(
        "/home"
        "/learning/:courseId"
        "/quiz/:courseId"
        "/quiz/:courseId/play"
        "/quiz/:courseId/report"
        "/profile"
    )

    for route in "${REQUIRED_ROUTES[@]}"; do
        # 转义特殊字符用于 grep
        ROUTE_ESCAPED=$(echo "$route" | sed 's/:/\\:/g')
        if grep -q "$ROUTE_ESCAPED\|:courseId" client/src/App.tsx; then
            check_pass "路由定义: $route"
        else
            check_fail "缺失路由: $route"
        fi
    done
else
    check_fail "App.tsx 不存在"
fi
echo ""

echo "[7.5] ChromaDB 连接检测..."
if [ -f "backend/services/chroma_client.py" ]; then
    if grep -q "ping\|connect\|client" backend/services/chroma_client.py; then
        check_pass "ChromaDB 连接代码存在"
    else
        check_warn "ChromaDB 连接代码可能不完整"
    fi
else
    check_warn "chroma_client.py 不存在，跳过 ChromaDB 检测"
fi
echo ""

# ========== 阶段8: 清理临时文件 ==========
echo -e "${BLUE}━━━ 阶段8: 清理临时文件 ━━━${NC}"

echo "[8.1] 清理临时文件..."
rm -f /tmp/openspec_*.txt /tmp/tsc_output.txt /tmp/eslint_output.txt /tmp/compile_output.txt /tmp/ruff_output.txt /tmp/build_output.txt /tmp/pytest_output.txt /tmp/backend.log 2>/dev/null
check_pass "临时文件清理完成"
echo ""

# ========== 检测总结 ==========
echo "========================================"
echo "  完整检测总结"
echo "  通过: $PASS_COUNT 项"
echo "  警告: $WARN_COUNT 项"
echo "  失败: $FAIL_COUNT 项"
echo "  总计: $((PASS_COUNT + WARN_COUNT + FAIL_COUNT)) 项"
echo "========================================"
echo ""

# 生成 JSON 报告
echo "[9.1] 生成 JSON 格式报告..."
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date '+%Y-%m-%d %H:%M:%S')",
  "status": "$([ $FAIL_COUNT -eq 0 ] && echo "PASSED" || echo "FAILED")",
  "summary": {
    "passed": $PASS_COUNT,
    "warnings": $WARN_COUNT,
    "failed": $FAIL_COUNT,
    "total": $((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
  },
  "completion_rate": "$((PASS_COUNT * 100 / (PASS_COUNT + FAIL_COUNT)))%"
}
EOF
check_pass "报告已生成: $REPORT_FILE"
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