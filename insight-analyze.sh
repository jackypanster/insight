#!/bin/bash
# ⚠️ DEPRECATED - 此脚本即将被移除
# 
# 请使用以下替代方案：
#   - 仅分析: ./insight-cli.sh <目录>
#   - 仅查看: ./insight-viewer.sh
#   - 完整流程: ./insight-all.sh <目录>
# 
# 此脚本将在验证新架构稳定后删除
# Deprecated since: 2025-01-10
# Planned removal: 验证测试完成后
#
# 原有功能已迁移到 insight-all.sh

set -e

echo "⚠️  警告: insight-analyze.sh 已废弃，请使用 insight-all.sh"
echo "🔄 自动重定向到 insight-all.sh..."
echo ""

# 自动重定向到 insight-all.sh
exec ./insight-all.sh "$@"

# 以下为原始代码，仅保留用于向后兼容性验证
# =======================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 检测操作系统
detect_os() {
    case "$OSTYPE" in
        darwin*)  echo "macos" ;;
        linux*)   echo "linux" ;;
        msys*|cygwin*|win32) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

OS=$(detect_os)

# 打开浏览器函数
open_browser() {
    local url="$1"
    case "$OS" in
        macos)   open "$url" ;;
        linux)   xdg-open "$url" 2>/dev/null || true ;;
        windows) cmd.exe /c start "$url" 2>/dev/null || true ;;
        *)       echo "💡 请手动打开浏览器访问: $url" ;;
    esac
}

# 清理函数
cleanup() {
    if [ "$CLEANUP_CONTAINER" = "true" ] && docker ps -q -f name=insight-viewer >/dev/null 2>&1; then
        echo ""
        echo "${YELLOW}🧹 清理容器...${NC}"
        docker stop insight-viewer >/dev/null 2>&1 || true
        docker rm insight-viewer >/dev/null 2>&1 || true
    fi
}

# 设置清理陷阱
trap cleanup EXIT

# 显示帮助信息
show_help() {
    echo "${BLUE}🚀 Insight 遗留代码一键分析工具${NC}"
    echo ""
    echo "用法:"
    echo "  $0 [选项] <代码目录>"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -o, --output DIR    指定输出目录 (默认: ./insight-docs)"
    echo "  -p, --port PORT     指定Web服务端口 (默认: 3000)"
    echo "  --no-browser        不自动打开浏览器"
    echo "  --cleanup           完成后清理Docker容器"
    echo "  --rebuild           重新构建Docker镜像"
    echo "  --verbose           显示详细输出"
    echo ""
    echo "示例:"
    echo "  $0 ~/projects/legacy-system"
    echo "  $0 --output ./docs --port 8080 ~/old-code"
    echo "  $0 --no-browser --cleanup ~/analyze-this"
    echo ""
}

# 默认值
TARGET_DIR=""
OUTPUT_DIR="./insight-docs"
WEB_PORT="3000"
OPEN_BROWSER="true"
CLEANUP_CONTAINER="false"
REBUILD_IMAGE="false"
VERBOSE="false"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -p|--port)
            WEB_PORT="$2"
            shift 2
            ;;
        --no-browser)
            OPEN_BROWSER="false"
            shift
            ;;
        --cleanup)
            CLEANUP_CONTAINER="true"
            shift
            ;;
        --rebuild)
            REBUILD_IMAGE="true"
            shift
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        -*)
            echo "❌ 未知选项: $1"
            show_help
            exit 1
            ;;
        *)
            if [ -z "$TARGET_DIR" ]; then
                TARGET_DIR="$1"
            else
                echo "❌ 只能指定一个代码目录"
                exit 1
            fi
            shift
            ;;
    esac
done

# 检查必需参数
if [ -z "$TARGET_DIR" ]; then
    echo "❌ 请指定要分析的代码目录"
    echo ""
    show_help
    exit 1
fi

# 检查目录是否存在
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ 指定的目录不存在: $TARGET_DIR"
    exit 1
fi

# 转换为绝对路径
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

# 输出详细信息的函数
verbose_log() {
    if [ "$VERBOSE" = "true" ]; then
        echo "$@"
    fi
}

echo "${BLUE}🚀 Insight 遗留代码分析工具${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 分析目录: ${CYAN}$TARGET_DIR${NC}"
echo "📊 输出目录: ${CYAN}$OUTPUT_DIR${NC}"
echo "🌐 Web端口:   ${CYAN}$WEB_PORT${NC}"
echo ""

# 1. 检查Docker
echo "${YELLOW}[1/5]${NC} 检查Docker环境..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    echo "💡 提示: 启动Docker Desktop或运行 'sudo systemctl start docker'"
    exit 1
fi
verbose_log "✓ Docker运行正常"

# 2. 检查环境变量
echo "${YELLOW}[2/5]${NC} 检查API配置..."
if [ -z "$OPENROUTER_API_KEY" ] && [ ! -f ".env" ]; then
    echo "❌ 未找到API Key配置"
    echo "💡 请设置OPENROUTER_API_KEY环境变量或创建.env文件"
    echo "   获取API Key: https://openrouter.ai/"
    exit 1
fi

if [ -f ".env" ]; then
    verbose_log "✓ 找到.env配置文件"
    # 读取.env文件中的API key
    if grep -q "OPENROUTER_API_KEY" .env; then
        verbose_log "✓ .env文件包含OPENROUTER_API_KEY"
    fi
fi

# 3. 构建/更新镜像
echo "${YELLOW}[3/5]${NC} 准备Docker镜像..."
if [ "$REBUILD_IMAGE" = "true" ] || ! docker images -q insight:dev >/dev/null 2>&1; then
    if [ "$VERBOSE" = "true" ]; then
        ./deploy/scripts/docker-build.sh --dev
    else
        ./deploy/scripts/docker-build.sh --dev >/dev/null 2>&1
    fi
    verbose_log "✓ Docker镜像构建完成"
else
    verbose_log "✓ 使用现有Docker镜像"
fi

# 4. 停止现有服务（如果存在）
if docker ps -q -f name=insight-viewer >/dev/null 2>&1; then
    echo "${YELLOW}🛑 停止现有服务...${NC}"
    docker stop insight-viewer >/dev/null 2>&1 || true
    docker rm insight-viewer >/dev/null 2>&1 || true
fi

# 5. 分析代码
echo "${YELLOW}[4/5]${NC} 分析遗留代码..."
verbose_log "执行命令: docker run --rm -v \"$TARGET_DIR\":/app/target:ro -v \"$(pwd)/$OUTPUT_DIR\":/app/output ..."

# 创建输出目录（如果不存在）
mkdir -p "$OUTPUT_DIR"

# 构建环境变量参数
ENV_ARGS=""
if [ -f ".env" ]; then
    ENV_ARGS="--env-file .env"
elif [ -n "$OPENROUTER_API_KEY" ]; then
    ENV_ARGS="-e OPENROUTER_API_KEY=$OPENROUTER_API_KEY"
fi

# 执行分析
if [ "$VERBOSE" = "true" ]; then
    docker run --rm \
        -v "$(pwd)":/app \
        -v "$TARGET_DIR":/app/target:ro \
        -v "$(pwd)/$OUTPUT_DIR":/app/output \
        -w /app \
        $ENV_ARGS \
        insight:dev \
        sh -c "pnpm install && pnpm dev analyze /app/target --output /app/output --verbose"
else
    docker run --rm \
        -v "$(pwd)":/app \
        -v "$TARGET_DIR":/app/target:ro \
        -v "$(pwd)/$OUTPUT_DIR":/app/output \
        -w /app \
        $ENV_ARGS \
        insight:dev \
        sh -c "pnpm install && pnpm dev analyze /app/target --output /app/output"
fi

# 检查分析结果
if [ ! -f "$OUTPUT_DIR/README.md" ]; then
    echo "❌ 分析失败，未生成文档"
    echo "💡 请检查目标目录是否包含支持的代码文件"
    exit 1
fi

verbose_log "✓ 代码分析完成"

# 6. 启动Web服务
echo "${YELLOW}[5/5]${NC} 启动图形化展示服务..."

# 检查端口是否被占用
if lsof -i ":$WEB_PORT" >/dev/null 2>&1; then
    echo "⚠️  端口 $WEB_PORT 已被占用"
    # 寻找可用端口
    for port in {3001..3010}; do
        if ! lsof -i ":$port" >/dev/null 2>&1; then
            WEB_PORT="$port"
            echo "💡 使用替代端口: $WEB_PORT"
            break
        fi
    done
fi

docker run -d --name insight-viewer \
    -p "$WEB_PORT":3000 \
    -v "$(pwd)":/app \
    -v "$(pwd)/$OUTPUT_DIR":/app/docs:ro \
    -w /app \
    insight:dev \
    sh -c "pnpm install && pnpm dev serve --docs-dir /app/docs --port 3000" >/dev/null

# 等待服务启动
echo "🔄 等待Web服务启动..."
for i in {1..30}; do
    if curl -s "http://localhost:$WEB_PORT/api/health" >/dev/null 2>&1; then
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ Web服务启动超时"
        docker logs insight-viewer 2>/dev/null || true
        exit 1
    fi
done

verbose_log "✓ Web服务启动成功"

# 显示结果
echo ""
echo "${GREEN}✅ 分析完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 访问地址: ${BLUE}http://localhost:$WEB_PORT${NC}"
echo "📊 文档路径: ${CYAN}$(pwd)/$OUTPUT_DIR${NC}"

# 统计信息
if [ -f "$OUTPUT_DIR/STATISTICS.json" ]; then
    echo ""
    echo "📈 分析统计:"
    if command -v jq >/dev/null 2>&1; then
        # 使用jq解析（如果可用）
        FILES=$(jq -r '.totalFiles // "N/A"' "$OUTPUT_DIR/STATISTICS.json" 2>/dev/null || echo "N/A")
        CLASSES=$(jq -r '.totalClasses // "N/A"' "$OUTPUT_DIR/STATISTICS.json" 2>/dev/null || echo "N/A")
        FUNCTIONS=$(jq -r '.totalFunctions // "N/A"' "$OUTPUT_DIR/STATISTICS.json" 2>/dev/null || echo "N/A")
        echo "  • 分析文件: $FILES 个"
        echo "  • 发现类: $CLASSES 个" 
        echo "  • 发现函数: $FUNCTIONS 个"
    else
        echo "  • 详细统计信息请查看: $OUTPUT_DIR/STATISTICS.json"
    fi
fi

echo ""
echo "💡 功能提示:"
echo "  • 📊 架构图表自动渲染（支持缩放、下载）"
echo "  • 🔍 依赖关系可视化"
echo "  • 📱 响应式设计，支持移动端"
echo "  • 🎨 交互式Mermaid图表"

if [ "$CLEANUP_CONTAINER" = "false" ]; then
    echo ""
    echo "🛑 停止服务:"
    echo "  docker stop insight-viewer"
    echo ""
    echo "🧹 清理容器:"
    echo "  docker rm insight-viewer"
fi

echo ""

# 自动打开浏览器
if [ "$OPEN_BROWSER" = "true" ]; then
    echo "🚀 正在打开浏览器..."
    sleep 2  # 等待服务完全启动
    open_browser "http://localhost:$WEB_PORT"
fi

echo "${GREEN}🎉 享受探索遗留代码的乐趣吧！${NC}"