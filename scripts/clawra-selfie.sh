#!/bin/bash
# clawra-selfie.sh
# Edit Clawra's reference image and send to a channel via OpenClaw
#
# Usage: ./clawra-selfie.sh "<user_context>" "<platform>" "<target>" [mode] [caption]
#
# Environment variables required:
#   OPENROUTER_API_KEY - Your OpenRouter API key (https://openrouter.ai/keys)
#
# Example:
#   OPENROUTER_API_KEY=your_key ./clawra-selfie.sh "wearing a cowboy hat" feishu oc_xxxxxx mirror

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check required environment variables
if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  log_error "OPENROUTER_API_KEY environment variable not set"
  echo "Get your API key from: https://openrouter.ai/keys"
  exit 1
fi

# Check for uv
if ! command -v uv &> /dev/null; then
  log_error "uv is required but not installed"
  echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

# Locate nano-banana-pro script
NBP_SCRIPT="$HOME/.openclaw/workspace/skills/nano-banana-pro/scripts/generate_image.py"
if [ ! -f "$NBP_SCRIPT" ]; then
  NBP_SCRIPT="$HOME/.openclaw/skills/nano-banana-pro/scripts/generate_image.py"
fi
if [ ! -f "$NBP_SCRIPT" ]; then
  log_error "nano-banana-pro not found. Install it via OpenClaw skill marketplace."
  exit 1
fi

# Parse arguments
USER_CONTEXT="${1:-}"
PLATFORM="${2:-}"
TARGET="${3:-}"
MODE="${4:-auto}"
CAPTION="${5:-}"
ACCOUNT="${6:-}"  # optional: openclaw account id (e.g. feishu-home)

if [ -z "$USER_CONTEXT" ] || [ -z "$PLATFORM" ] || [ -z "$TARGET" ]; then
  echo "Usage: $0 <user_context> <platform> <target> [mode] [caption] [account]"
  echo "Platforms: feishu, telegram, discord, slack, whatsapp, signal..."
  echo "Modes: mirror, direct, auto (default)"
  echo "Example: $0 'wearing a cowboy hat' feishu oc_xxxxxx mirror '' feishu-home"
  exit 1
fi

# Reference image — co-located in this skill's assets/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFERENCE_IMAGE="$SCRIPT_DIR/../assets/clawra.png"

if [ ! -f "$REFERENCE_IMAGE" ]; then
  log_error "Reference image not found at: $REFERENCE_IMAGE"
  exit 1
fi

# Auto-detect mode
if [ "$MODE" == "auto" ]; then
  if echo "$USER_CONTEXT" | grep -qiE "outfit|wearing|clothes|dress|suit|fashion|full-body|mirror"; then
    MODE="mirror"
  elif echo "$USER_CONTEXT" | grep -qiE "cafe|restaurant|beach|park|city|close-up|portrait|face|eyes|smile"; then
    MODE="direct"
  else
    MODE="mirror"
  fi
  log_info "Auto-detected mode: $MODE"
fi

# Build prompt
if [ "$MODE" == "direct" ]; then
  PROMPT="a close-up selfie taken by herself at $USER_CONTEXT, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible"
else
  PROMPT="make a pic of this person, but $USER_CONTEXT. the person is taking a mirror selfie"
fi

log_info "Mode: $MODE"
log_info "Prompt: $PROMPT"

# Output filename
OUTPUT_FILE="/tmp/$(date +%Y-%m-%d-%H-%M-%S)-clawra-selfie.png"

# Generate image with nano-banana-pro
log_info "Generating image with nano-banana-pro..."
NBP_OUTPUT=$(OPENROUTER_API_KEY="$OPENROUTER_API_KEY" uv run "$NBP_SCRIPT" \
  --prompt "$PROMPT" \
  --filename "$OUTPUT_FILE" \
  -i "$REFERENCE_IMAGE")

echo "$NBP_OUTPUT"

# Extract local file path from MEDIA: line
IMAGE_PATH=$(echo "$NBP_OUTPUT" | grep '^MEDIA:' | head -1 | sed 's/^MEDIA:[[:space:]]*//' | tr -d '\r' | sed 's/[[:space:]]*$//')

if [ -z "$IMAGE_PATH" ] || [ ! -f "$IMAGE_PATH" ]; then
  log_error "Failed to find generated image. Check nano-banana-pro output above."
  exit 1
fi

log_info "Image generated: $IMAGE_PATH"
log_info "Sending to $PLATFORM / $TARGET"

# Default caption
if [ -z "$CAPTION" ]; then
  CAPTION="📸"
fi

# Send via OpenClaw
SEND_ARGS=(--channel "$PLATFORM" --target "$TARGET" --message "$CAPTION" --media "$IMAGE_PATH")
if [ -n "$ACCOUNT" ]; then
  SEND_ARGS+=(--account "$ACCOUNT")
fi
openclaw message send "${SEND_ARGS[@]}"

log_info "Done!"
