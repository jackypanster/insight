#!/bin/bash
set -e

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
        darwin*)  echo "macos" ;;\
        linux*)   echo "linux" ;;\
        msys*|cygwin*|win32) echo "windows" ;;\
        *)        echo "unknown" ;;\
    esac
}

OS=$(detect_os)

# 打开浏览器函数
open_browser() {
    local url="$1"
    case "$OS" in
        macos)   open "$url" ;;\
        linux)   xdg-open "$url" 2>/dev/null || true ;;\
        windows) cmd.exe /c start "$url" 2>/dev/null || true ;;\
        *)       echo "💡 请手动打开浏览器访问: $url" ;;\
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
    echo "${BLUE}🌐 Insight Viewer - 文档查看工具${NC}"
    echo ""
    echo "用法:"
    echo "  $0 [选项] [文档目录]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -d, --docs-dir DIR  指定文档目录 (默认: ./insight-docs)"
    echo "  -p, --port PORT     指定Web服务端口 (默认: 3000)"
    echo "  --no-browser        不自动打开浏览器"
    echo "  --cleanup           退出时清理Docker容器"
    echo "  --verbose           显示详细输出"
    echo ""
    echo "示例:"
    echo "  $0                              # 使用默认文档目录"
    echo "  $0 --docs-dir ./custom-docs     # 指定文档目录"
    echo "  $0 --port 8080 --no-browser     # 自定义端口，不开浏览器"
    echo "  $0 --cleanup                    # 退出时清理容器"
    echo ""
}

# 默认值
DOCS_DIR="./insight-docs"
WEB_PORT="3001"
OPEN_BROWSER="true"
CLEANUP_CONTAINER="false"
VERBOSE="false"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--docs-dir)
            DOCS_DIR="$2"
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
            if [ -z "$CUSTOM_DOCS_DIR" ]; then
                DOCS_DIR="$1"
                CUSTOM_DOCS_DIR="true"
            else
                echo "❌ 只能指定一个文档目录"
                exit 1
            fi
            shift
            ;;
    esac
done

# 输出详细信息的函数
verbose_log() {
    if [ "$VERBOSE" = "true" ]; then
        echo "$@"
    fi
}

echo "${BLUE}🌐 Insight Viewer - 文档查看工具${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 文档目录: ${CYAN}$DOCS_DIR${NC}"
echo "🌐 Web端口:  ${CYAN}$WEB_PORT${NC}"
echo ""

# 1. 检查Docker
echo "${YELLOW}[1/4]${NC} 检查Docker环境..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    echo "💡 提示: 启动Docker Desktop或运行 'sudo systemctl start docker'"
    exit 1
fi
verbose_log "✓ Docker运行正常"

# 2. 检查文档目录
echo "${YELLOW}[2/4]${NC} 检查文档目录..."
if [ ! -d "$DOCS_DIR" ]; then
    echo "❌ 文档目录不存在: $DOCS_DIR"
    echo "💡 请先运行代码分析生成文档:"
    echo "   ./insight-cli.sh <代码目录>"
    echo "   或运行完整流程:"
    echo "   ./insight-all.sh <代码目录>"
    exit 1
fi

# 检查是否有文档文件
if [ ! -f "$DOCS_DIR/README.md" ] && [ ! -f "$DOCS_DIR/ARCHITECTURE.md" ]; then
    echo "❌ 文档目录为空或无有效文档文件"
    echo "💡 请先运行代码分析生成文档:"
    echo "   ./insight-cli.sh <代码目录>"
    exit 1
fi

verbose_log "✓ 找到文档目录: $DOCS_DIR"

# 3. 停止现有服务（如果存在）
echo "${YELLOW}[3/4]${NC} 准备Web服务..."
if docker ps -q -f name=insight-viewer >/dev/null 2>&1; then
    echo "🛑 停止现有Web服务..."
    docker stop insight-viewer >/dev/null 2>&1 || true
    docker rm insight-viewer >/dev/null 2>&1 || true
fi

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

# 4. 启动Web服务
echo "${YELLOW}[4/4]${NC} 启动Web服务..."

# Build and run the lightweight viewer container
verbose_log "Building insight-viewer image..."
if [ ! -f "deploy/docker/Dockerfile.viewer" ]; then
    echo "❌ Dockerfile.viewer not found. Please ensure you're in the correct directory."
    exit 1
fi

# Build the viewer image if needed
if [ "$VERBOSE" = "true" ]; then
    docker build -t insight:viewer -f deploy/docker/Dockerfile.viewer .
else
    docker build -t insight:viewer -f deploy/docker/Dockerfile.viewer . >/dev/null 2>&1
fi

# Run the viewer container
docker run -d --name insight-viewer \
    -p "$WEB_PORT":3000 \
    -v "$(pwd)/$DOCS_DIR":/app/docs:ro \
    -e DOCS_DIR=/app/docs \
    -e HOST=0.0.0.0 \
    -e PORT=3000 \
    insight:viewer
# 等待服务启动
echo "🔄 等待Web服务启动..."
for i in {1..30}; do
    if HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy= curl -s "http://localhost:$WEB_PORT/api/health" >/dev/null 2>&1; then
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
echo "${GREEN}✅ Web服务已启动！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 访问地址: ${BLUE}http://localhost:$WEB_PORT${NC}"
echo "📊 文档路径: ${CYAN}$(pwd)/$DOCS_DIR${NC}"

# 统计信息
if [ -f "$DOCS_DIR/STATISTICS.json" ]; then
    echo ""
    echo "📈 文档统计:"
    if command -v jq >/dev/null 2>&1; then
        # 使用jq解析（如果可用）
        FILES=$(jq -r '.totalFiles // "N/A"' "$DOCS_DIR/STATISTICS.json" 2>/dev/null || echo "N/A")
        CLASSES=$(jq -r '.totalClasses // "N/A"' "$DOCS_DIR/STATISTICS.json" 2>/dev/null || echo "N/A")
        FUNCTIONS=$(jq -r '.totalFunctions // "N/A"' "$DOCS_DIR/STATISTICS.json" 2>/dev/null || echo "N/A")
        echo "  • 分析文件: $FILES 个"
        echo "  • 发现类: $CLASSES 个" 
        echo "  • 发现函数: $FUNCTIONS 个"
    else
        echo "  • 详细统计信息请查看: $DOCS_DIR/STATISTICS.json"
    fi
fi

echo ""
echo "💡 功能提示:"
echo "  • 📊 Mermaid架构图表自动渲染（支持缩放、下载）"
echo "  • 🔍 依赖关系可视化"
echo "  • 📱 响应式设计，支持移动端"
echo "  • 🎨 交互式图表控制"

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

echo "${GREEN}🎉 享受查看文档的乐趣吧！${NC}"
echo ""
echo "💡 按 Ctrl+C 停止服务"

# 保持脚本运行，直到用户中断
if [ "$CLEANUP_CONTAINER" = "true" ]; then
    # 如果设置了清理，等待用户中断
    while true; do
        sleep 1
    done
else
    # 否则显示状态信息后退出
    echo ""
    echo "ℹ️  Web服务正在后台运行"
    echo "   容器名: insight-viewer"
    echo "   访问地址: http://localhost:$WEB_PORT"
fi