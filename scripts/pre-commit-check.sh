#!/bin/bash
# Git pre-commit hook - 提交前自动检测
# 安装: cp scripts/pre-commit-check.sh .git/hooks/pre-commit

echo "🔍 正在运行 OpenSpec 完整检测..."

bash scripts/full-check.sh
RESULT=$?

if [ $RESULT -ne 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ❌ 提交被阻止！存在未完成项。"
    echo "  请运行: bash scripts/auto-fix.sh"
    echo "  然后重新运行: bash scripts/full-check.sh"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

echo ""
echo "✅ 检测通过，允许提交。"
exit 0