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

# 显示帮助信息
show_help() {
    echo "${BLUE}🔍 Insight CLI - 代码分析工具${NC}"
    echo ""
    echo "用法:"
    echo "  $0 [选项] <代码目录>"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -o, --output DIR    指定输出目录 (默认: ./insight-docs)"
    echo "  --verbose           显示详细输出"
    echo "  --rebuild           重新构建Docker镜像"
    echo ""
    echo "示例:"
    echo "  $0 ~/projects/legacy-system"
    echo "  $0 --output ./docs ~/old-code"
    echo "  $0 --verbose --rebuild ~/analyze-this"
    echo ""
}

# 默认值
TARGET_DIR=""
OUTPUT_DIR="./insight-docs"
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

echo "${BLUE}🔍 Insight CLI - 代码分析工具${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 分析目录: ${CYAN}$TARGET_DIR${NC}"
echo "📊 输出目录: ${CYAN}$OUTPUT_DIR${NC}"
echo ""

# 1. 检查Docker
echo "${YELLOW}[1/4]${NC} 检查Docker环境..."
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    echo "💡 提示: 启动Docker Desktop或运行 'sudo systemctl start docker'"
    exit 1
fi
verbose_log "✓ Docker运行正常"

# 2. 检查环境变量
echo "${YELLOW}[2/4]${NC} 检查API配置..."
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
echo "${YELLOW}[3/4]${NC} 准备Docker镜像..."
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

# 4. 执行分析
echo "${YELLOW}[4/4]${NC} 分析代码..."
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

# 停止任何现有的 insight-cli-temp 容器（如果存在）
if docker ps -a -q -f name=insight-cli-temp >/dev/null 2>&1; then
    verbose_log "清理旧的分析容器..."
    docker stop insight-cli-temp >/dev/null 2>&1 || true
    docker rm insight-cli-temp >/dev/null 2>&1 || true
fi

# 执行分析
if [ "$VERBOSE" = "true" ]; then
    docker run --rm \
        --name insight-cli-temp \
        -v "$(pwd)":/app \
        -v "$TARGET_DIR":/app/target:ro \
        -v "$(pwd)/$OUTPUT_DIR":/app/output \
        -w /app \
        $ENV_ARGS \
        insight:dev \
        sh -c "pnpm install && pnpm dev analyze /app/target --output /app/output --verbose"
else
    docker run --rm \
        --name insight-cli-temp \
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

# 显示结果
echo ""
echo "${GREEN}✅ 分析完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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
echo "💡 下一步:"
echo "  • 查看文档: 运行 ${CYAN}./insight-viewer.sh${NC}"
echo "  • 完整流程: 运行 ${CYAN}./insight-all.sh $TARGET_DIR${NC}"

echo ""
echo "${GREEN}🎉 代码分析完成！${NC}"