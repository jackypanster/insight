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
    echo "${BLUE}🚀 Insight All-in-One - 代码分析和查看一体化工具${NC}"
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
    echo "  --analyze-only      仅执行分析，不启动Web服务"
    echo "  --viewer-only       仅启动Web服务（假设文档已存在）"
    echo ""
    echo "示例:"
    echo "  $0 ~/projects/legacy-system                  # 完整流程"
    echo "  $0 --output ./docs --port 8080 ~/old-code   # 自定义配置"
    echo "  $0 --no-browser --cleanup ~/analyze-this    # 无浏览器，自动清理"
    echo "  $0 --analyze-only ~/project                  # 仅分析代码"
    echo "  $0 --viewer-only                             # 仅启动查看服务"
    echo ""
    echo "工作流程:"
    echo "  1. 🔍 使用 insight-cli.sh 分析代码"
    echo "  2. 🌐 使用 insight-viewer.sh 启动Web服务"
    echo "  3. 🚀 自动打开浏览器查看结果"
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
ANALYZE_ONLY="false"
VIEWER_ONLY="false"

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
        --analyze-only)
            ANALYZE_ONLY="true"
            shift
            ;;
        --viewer-only)
            VIEWER_ONLY="true"
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

# 参数验证
if [ "$VIEWER_ONLY" = "false" ] && [ -z "$TARGET_DIR" ]; then
    echo "❌ 请指定要分析的代码目录，或使用 --viewer-only 仅启动查看服务"
    echo ""
    show_help
    exit 1
fi

if [ "$VIEWER_ONLY" = "true" ] && [ -n "$TARGET_DIR" ]; then
    echo "⚠️  使用 --viewer-only 时会忽略代码目录参数"
fi

if [ "$ANALYZE_ONLY" = "true" ] && [ "$VIEWER_ONLY" = "true" ]; then
    echo "❌ --analyze-only 和 --viewer-only 不能同时使用"
    exit 1
fi

echo "${BLUE}🚀 Insight All-in-One - 代码分析和查看一体化工具${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$VIEWER_ONLY" = "false" ]; then
    echo "📁 分析目录: ${CYAN}$TARGET_DIR${NC}"
fi
echo "📊 输出目录: ${CYAN}$OUTPUT_DIR${NC}"
if [ "$ANALYZE_ONLY" = "false" ]; then
    echo "🌐 Web端口:   ${CYAN}$WEB_PORT${NC}"
fi
echo ""

# 构建CLI参数
CLI_ARGS=""
if [ "$VERBOSE" = "true" ]; then
    CLI_ARGS="$CLI_ARGS --verbose"
fi
if [ "$REBUILD_IMAGE" = "true" ]; then
    CLI_ARGS="$CLI_ARGS --rebuild"
fi
if [ "$OUTPUT_DIR" != "./insight-docs" ]; then
    CLI_ARGS="$CLI_ARGS --output $OUTPUT_DIR"
fi

# 构建Viewer参数
VIEWER_ARGS=""
if [ "$VERBOSE" = "true" ]; then
    VIEWER_ARGS="$VIEWER_ARGS --verbose"
fi
if [ "$OPEN_BROWSER" = "false" ]; then
    VIEWER_ARGS="$VIEWER_ARGS --no-browser"
fi
if [ "$CLEANUP_CONTAINER" = "true" ]; then
    VIEWER_ARGS="$VIEWER_ARGS --cleanup"
fi
if [ "$WEB_PORT" != "3000" ]; then
    VIEWER_ARGS="$VIEWER_ARGS --port $WEB_PORT"
fi
if [ "$OUTPUT_DIR" != "./insight-docs" ]; then
    VIEWER_ARGS="$VIEWER_ARGS --docs-dir $OUTPUT_DIR"
fi

# 第一步：代码分析
if [ "$VIEWER_ONLY" = "false" ]; then
    echo "${YELLOW}第一步：代码分析${NC}"
    echo "─────────────────"
    echo "🔍 执行命令: ./insight-cli.sh$CLI_ARGS $TARGET_DIR"
    echo ""
    
    if ! ./insight-cli.sh$CLI_ARGS "$TARGET_DIR"; then
        echo ""
        echo "❌ 代码分析失败"
        exit 1
    fi
    
    echo ""
    echo "${GREEN}✅ 代码分析完成${NC}"
    echo ""
fi

# 第二步：启动Web服务
if [ "$ANALYZE_ONLY" = "false" ]; then
    echo "${YELLOW}第二步：启动Web服务${NC}"
    echo "─────────────────"
    echo "🌐 执行命令: ./insight-viewer.sh$VIEWER_ARGS"
    echo ""
    
    if ! ./insight-viewer.sh$VIEWER_ARGS; then
        echo ""
        echo "❌ Web服务启动失败"
        exit 1
    fi
    
    echo ""
    echo "${GREEN}✅ Web服务启动完成${NC}"
else
    echo ""
    echo "${GREEN}✅ 分析完成！${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 文档路径: ${CYAN}$(pwd)/$OUTPUT_DIR${NC}"
    echo ""
    echo "💡 下一步:"
    echo "  • 查看文档: 运行 ${CYAN}./insight-viewer.sh --docs-dir $OUTPUT_DIR${NC}"
    echo "  • 完整服务: 运行 ${CYAN}./insight-all.sh --viewer-only${NC}"
fi

# 显示最终结果
if [ "$ANALYZE_ONLY" = "false" ]; then
    echo ""
    echo "${GREEN}🎉 全部完成！${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$VIEWER_ONLY" = "false" ]; then
        echo "🔍 代码已分析完成"
    fi
    echo "🌐 Web服务正在运行"
    
    # 显示统计信息
    if [ -f "$OUTPUT_DIR/STATISTICS.json" ]; then
        echo ""
        echo "📈 项目统计:"
        if command -v jq >/dev/null 2>&1; then
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
    echo "🌐 访问地址: ${BLUE}http://localhost:$WEB_PORT${NC}"
    echo "📊 文档路径: ${CYAN}$(pwd)/$OUTPUT_DIR${NC}"
    
    if [ "$CLEANUP_CONTAINER" = "false" ]; then
        echo ""
        echo "💡 管理服务:"
        echo "  • 停止服务: docker stop insight-viewer"
        echo "  • 清理容器: docker rm insight-viewer"
        echo "  • 重新启动: ./insight-viewer.sh --docs-dir $OUTPUT_DIR"
    fi
    
    echo ""
    echo "${GREEN}🎊 享受探索代码的乐趣吧！${NC}"
fi