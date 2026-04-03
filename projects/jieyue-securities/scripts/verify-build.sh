#!/bin/bash
#
# 捷阅证券前端构建验证脚本
# ANFSF V1.5.0 Layer 3 Governance Policy 实现
#
# 用途：验证 Next.js 构建产物完整性
# 使用：./verify-build.sh [frontend_dir]
#

set -e

FRONTEND_DIR="${1:-$(dirname "$0")/../frontend}"
STANDALONE_DIR="$FRONTEND_DIR/.next/standalone"
CSS_DIR="$FRONTEND_DIR/.next/static/css"
MIN_CSS_SIZE=5000  # 5KB - 最小 CSS 文件大小阈值

echo "🔍 捷阅证券前端构建验证"
echo "========================"
echo "目录：$FRONTEND_DIR"
echo ""

# 1. 检查构建目录是否存在
echo "1️⃣ 检查构建目录..."
if [ ! -d "$FRONTEND_DIR/.next" ]; then
    echo "❌ 构建目录不存在：$FRONTEND_DIR/.next"
    echo "   请先运行：npm run build"
    exit 1
fi
echo "✅ 构建目录存在"

# 2. 检查 standalone 目录
echo ""
echo "2️⃣ 检查 Standalone 目录..."
if [ ! -d "$STANDALONE_DIR" ]; then
    echo "❌ Standalone 目录不存在：$STANDALONE_DIR"
    echo "   可能原因："
    echo "   - next.config.js 未配置 output: 'standalone'"
    echo "   - 构建失败"
    exit 1
fi
echo "✅ Standalone 目录存在"

# 3. 检查 server.js
echo ""
echo "3️⃣ 检查 Server 文件..."
if [ ! -f "$STANDALONE_DIR/server.js" ]; then
    echo "❌ server.js 不存在"
    echo "   构建产物不完整"
    exit 1
fi
echo "✅ server.js 存在"

# 4. 检查 package.json
echo ""
echo "4️⃣ 检查 Package 配置..."
if [ ! -f "$STANDALONE_DIR/package.json" ]; then
    echo "❌ package.json 不存在"
    exit 1
fi
echo "✅ package.json 存在"

# 5. 检查静态资源
echo ""
echo "5️⃣ 检查静态资源..."
if [ ! -d "$FRONTEND_DIR/.next/static" ]; then
    echo "❌ 静态资源目录不存在"
    exit 1
fi
echo "✅ 静态资源目录存在"

# 6. 检查 CSS 文件
echo ""
echo "6️⃣ 检查 CSS 文件..."
CSS_COUNT=$(find "$CSS_DIR" -name "*.css" 2>/dev/null | wc -l)
if [ "$CSS_COUNT" -eq 0 ]; then
    echo "❌ CSS 文件不存在"
    exit 1
fi
echo "✅ 找到 $CSS_COUNT 个 CSS 文件"

# 7. 检查 CSS 文件大小
echo ""
echo "7️⃣ 检查 CSS 文件大小..."
for css_file in "$CSS_DIR"/*.css; do
    if [ -f "$css_file" ]; then
        css_size=$(wc -c < "$css_file")
        css_name=$(basename "$css_file")
        
        if [ "$css_size" -lt "$MIN_CSS_SIZE" ]; then
            echo "❌ CSS 文件过小：$css_name ($css_size bytes)"
            echo "   可能原因："
            echo "   - Tailwind CSS 语法不兼容（v3 vs v4）"
            echo "   - globals.css 配置错误"
            echo "   - 构建未完成"
            exit 1
        else
            echo "✅ $css_name: $css_size bytes"
        fi
    fi
done

# 8. 检查 JS chunks
echo ""
echo "8️⃣ 检查 JS Chunks..."
JS_DIR="$FRONTEND_DIR/.next/static/chunks"
JS_COUNT=$(find "$JS_DIR" -name "*.js" 2>/dev/null | wc -l)
if [ "$JS_COUNT" -lt 5 ]; then
    echo "⚠️  JS Chunks 过少：$JS_COUNT（正常应 > 5）"
else
    echo "✅ 找到 $JS_COUNT 个 JS 文件"
fi

# 9. 检查 page 文件
echo ""
echo "9️⃣ 检查页面文件..."
PAGE_MANIFEST="$FRONTEND_DIR/.next/server/app-paths-manifest.json"
if [ -f "$PAGE_MANIFEST" ]; then
    PAGE_COUNT=$(grep -o '"/[^"]*"' "$PAGE_MANIFEST" | wc -l)
    echo "✅ 找到 $PAGE_COUNT 个页面路由"
else
    echo "⚠️  页面清单文件不存在"
fi

# 10. 检查 package.json 依赖版本
echo ""
echo "🔟 检查依赖版本锁定..."
if [ -f "$FRONTEND_DIR/package-lock.json" ]; then
    echo "✅ package-lock.json 存在（版本已锁定）"
elif [ -f "$FRONTEND_DIR/pnpm-lock.yaml" ]; then
    echo "✅ pnpm-lock.yaml 存在（版本已锁定）"
elif [ -f "$FRONTEND_DIR/yarn.lock" ]; then
    echo "✅ yarn.lock 存在（版本已锁定）"
else
    echo "⚠️  未发现版本锁定文件"
    echo "   建议：使用 package-lock.json 锁定依赖版本"
fi

# 总结
echo ""
echo "========================"
echo "✅ 构建验证通过！"
echo ""
echo "📊 构建产物摘要:"
echo "   - Standalone 目录：$(du -sh "$STANDALONE_DIR" | cut -f1)"
echo "   - CSS 文件：$CSS_COUNT 个"
echo "   - JS 文件：$JS_COUNT 个"
echo "   - 页面路由：$PAGE_COUNT 个"
echo ""
echo "🚀 部署命令:"
echo "   cd $STANDALONE_DIR && node server.js"
echo ""

exit 0
