# clawra-selfie Refactor: nano-banana-pro + Feishu Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fal.ai image editing with nano-banana-pro (Gemini 3 Pro via OpenRouter) and document Feishu as a supported platform.

**Architecture:** The image generation step changes from a remote fal.ai HTTP call (returns URL) to a local `uv run` invocation of nano-banana-pro's `generate_image.py` (returns local file path). The reference image is read from the skill's own `assets/clawra.png`. OpenClaw's `--media` flag accepts local paths, so no upload step is needed. Feishu is already natively supported by OpenClaw — only documentation changes are needed.

**Tech Stack:** Node.js (installer), Bash (skill scripts), TypeScript (alternative implementation), OpenClaw CLI, nano-banana-pro (`uv run generate_image.py`), OpenRouter API (`OPENROUTER_API_KEY`)

**Note on file duplication:** `SKILL.md` = `skill/SKILL.md` and `scripts/` = `skill/scripts/` — always update both copies in the same step.

---

### Task 1: Remove @fal-ai/client from package.json

**Files:**
- Modify: `package.json`

**Step 1: Remove the dependency**

Edit `package.json` — remove `"@fal-ai/client": "^1.2.0"` from `devDependencies`.

**Step 2: Verify**

```bash
cat package.json | grep fal
```
Expected: no output.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: remove @fal-ai/client dependency"
```

---

### Task 2: Update SKILL.md — env vars, allowed-tools, workflow

**Files:**
- Modify: `SKILL.md`
- Modify: `skill/SKILL.md`

Both files are identical — apply the same edits to both.

**Step 1: Update the frontmatter**

Replace the frontmatter block at the top of each file:

```markdown
---
name: clawra-selfie
description: Edit Clawra's reference image with nano-banana-pro (Gemini 3 Pro via OpenRouter) and send selfies to messaging channels via OpenClaw
allowed-tools: Bash(npm:*) Bash(npx:*) Bash(openclaw:*) Bash(uv:*) Read Write WebFetch
---
```

**Step 2: Update the Required Environment Variables section**

Find:
```
FAL_KEY=your_fal_api_key          # Get from https://fal.ai/dashboard/keys
OPENCLAW_GATEWAY_TOKEN=your_token  # From: openclaw doctor --generate-gateway-token
```

Replace with:
```
OPENROUTER_API_KEY=your_openrouter_key  # Get from https://openrouter.ai/keys
OPENCLAW_GATEWAY_TOKEN=your_token        # From: openclaw doctor --generate-gateway-token
```

**Step 3: Replace the "Step 2: Edit Image" section**

Remove the entire fal.ai curl block (the `## Step 2: Edit Image with Grok Imagine` section and all its content including the bash snippet and Response Format block).

Replace with:

````markdown
### Step 2: Edit Image with nano-banana-pro

Use nano-banana-pro's script to edit the reference image locally:

```bash
# Locate nano-banana-pro script
NBP_SCRIPT="$HOME/.openclaw/workspace/skills/nano-banana-pro/scripts/generate_image.py"
if [ ! -f "$NBP_SCRIPT" ]; then
  NBP_SCRIPT="$HOME/.openclaw/skills/nano-banana-pro/scripts/generate_image.py"
fi

REFERENCE_IMAGE="{baseDir}/assets/clawra.png"
OUTPUT_FILE="/tmp/$(date +%Y-%m-%d-%H-%M-%S)-clawra-selfie.png"

OPENROUTER_API_KEY="$OPENROUTER_API_KEY" uv run "$NBP_SCRIPT" \
  --prompt "$PROMPT" \
  --filename "$OUTPUT_FILE" \
  -i "$REFERENCE_IMAGE"
```

**Output:** The script prints `MEDIA: <absolute_path>` on success. Extract this path for the next step.
````

**Step 4: Update the "Step 3: Send Image" section**

The `--media` value changes from a URL to the local file path extracted from the `MEDIA:` output line. Update the example:

```bash
openclaw message send \
  --action send \
  --channel "<TARGET_CHANNEL>" \
  --message "<CAPTION_TEXT>" \
  --media "<LOCAL_FILE_PATH>"
```

**Step 5: Add Feishu to the Supported Platforms table**

Find the platforms table and add a row:

```markdown
| Feishu (飞书) | `open_chat_id` or `user_id` | `oc_xxxxxx` |
```

**Step 6: Remove the "Grok Imagine Edit Parameters" section entirely** (no longer applicable).

**Step 7: Update the Setup Requirements section**

Replace:
```
### 1. Install fal.ai client (for Node.js usage)
npm install @fal-ai/client
```
With:
```
### 1. Install nano-banana-pro skill
Install from OpenClaw skill marketplace or clone to ~/.openclaw/workspace/skills/nano-banana-pro/
```

Replace any reference to `FAL_KEY` with `OPENROUTER_API_KEY`.

**Step 8: Verify both files are identical**

```bash
diff SKILL.md skill/SKILL.md
```
Expected: no output.

**Step 9: Commit**

```bash
git add SKILL.md skill/SKILL.md
git commit -m "feat: replace fal.ai with nano-banana-pro in SKILL.md, add Feishu docs"
```

---

### Task 3: Update clawra-selfie.sh scripts

**Files:**
- Modify: `scripts/clawra-selfie.sh`
- Modify: `skill/scripts/clawra-selfie.sh`

Both files are identical — apply the same edits to both.

**Step 1: Replace the script with the new implementation**

Rewrite both shell scripts completely:

```bash
#!/bin/bash
# clawra-selfie.sh
# Edit Clawra's reference image and send to a channel via OpenClaw
#
# Usage: ./clawra-selfie.sh "<user_context>" "<channel>" [mode] [caption]
#
# Environment variables required:
#   OPENROUTER_API_KEY - Your OpenRouter API key
#
# Example:
#   OPENROUTER_API_KEY=your_key ./clawra-selfie.sh "wearing a cowboy hat" "#general" mirror

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
CHANNEL="${2:-}"
MODE="${3:-auto}"
CAPTION="${4:-}"

if [ -z "$USER_CONTEXT" ] || [ -z "$CHANNEL" ]; then
  echo "Usage: $0 <user_context> <channel> [mode] [caption]"
  echo "Modes: mirror, direct, auto (default)"
  echo "Example: $0 'wearing a cowboy hat' '#general' mirror"
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
IMAGE_PATH=$(echo "$NBP_OUTPUT" | grep '^MEDIA:' | sed 's/^MEDIA: //')

if [ -z "$IMAGE_PATH" ] || [ ! -f "$IMAGE_PATH" ]; then
  log_error "Failed to find generated image. Check nano-banana-pro output above."
  exit 1
fi

log_info "Image generated: $IMAGE_PATH"
log_info "Sending to channel: $CHANNEL"

# Default caption
if [ -z "$CAPTION" ]; then
  CAPTION="📸"
fi

# Send via OpenClaw
openclaw message send \
  --action send \
  --channel "$CHANNEL" \
  --message "$CAPTION" \
  --media "$IMAGE_PATH"

log_info "Done!"
```

**Step 2: Verify both files are identical**

```bash
diff scripts/clawra-selfie.sh skill/scripts/clawra-selfie.sh
```
Expected: no output.

**Step 3: Commit**

```bash
git add scripts/clawra-selfie.sh skill/scripts/clawra-selfie.sh
git commit -m "feat: replace fal.ai curl with nano-banana-pro in shell scripts"
```

---

### Task 4: Update clawra-selfie.ts scripts

**Files:**
- Modify: `scripts/clawra-selfie.ts`
- Modify: `skill/scripts/clawra-selfie.ts`

Both files are identical — apply the same edits to both.

**Step 1: Rewrite both TypeScript scripts**

```typescript
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

type SelfieMode = "mirror" | "direct" | "auto";

function findNanoBananaPro(): string {
  const candidates = [
    path.join(os.homedir(), ".openclaw/workspace/skills/nano-banana-pro/scripts/generate_image.py"),
    path.join(os.homedir(), ".openclaw/skills/nano-banana-pro/scripts/generate_image.py"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("nano-banana-pro not found. Install it via OpenClaw skill marketplace.");
}

function detectMode(userContext: string): "mirror" | "direct" {
  const mirrorKeywords = /outfit|wearing|clothes|dress|suit|fashion|full-body|mirror/i;
  const directKeywords = /cafe|restaurant|beach|park|city|close-up|portrait|face|eyes|smile/i;
  if (directKeywords.test(userContext)) return "direct";
  if (mirrorKeywords.test(userContext)) return "mirror";
  return "mirror";
}

function buildPrompt(userContext: string, mode: "mirror" | "direct"): string {
  if (mode === "direct") {
    return `a close-up selfie taken by herself at ${userContext}, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, not a mirror selfie, phone held at arm's length, face fully visible`;
  }
  return `make a pic of this person, but ${userContext}. the person is taking a mirror selfie`;
}

async function editAndSend(
  userContext: string,
  channel: string,
  mode: SelfieMode = "auto",
  caption?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable not set");

  const nbpScript = findNanoBananaPro();

  // Reference image is in this skill's assets/
  const referenceImage = path.resolve(__dirname, "../assets/clawra.png");
  if (!fs.existsSync(referenceImage)) {
    throw new Error(`Reference image not found at: ${referenceImage}`);
  }

  const actualMode = mode === "auto" ? detectMode(userContext) : mode;
  console.log(`Mode: ${actualMode}`);

  const prompt = buildPrompt(userContext, actualMode);
  console.log(`Prompt: ${prompt}`);

  const now = new Date().toISOString().replace(/[T:]/g, "-").slice(0, 19);
  const outputFile = `/tmp/${now}-clawra-selfie.png`;

  // Generate image
  console.log("Generating image with nano-banana-pro...");
  const { stdout } = await execAsync(
    `uv run "${nbpScript}" --prompt "${prompt.replace(/"/g, '\\"')}" --filename "${outputFile}" -i "${referenceImage}"`,
    { env: { ...process.env, OPENROUTER_API_KEY: apiKey } }
  );

  console.log(stdout);

  // Extract local file path from MEDIA: line
  const mediaLine = stdout.split("\n").find((l) => l.startsWith("MEDIA:"));
  if (!mediaLine) throw new Error("nano-banana-pro did not output a MEDIA: line");
  const imagePath = mediaLine.replace("MEDIA: ", "").trim();

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Generated image not found at: ${imagePath}`);
  }

  console.log(`Image generated: ${imagePath}`);
  console.log(`Sending to ${channel}...`);

  const messageCaption = caption ?? "📸";
  await execAsync(
    `openclaw message send --action send --channel "${channel}" --message "${messageCaption}" --media "${imagePath}"`
  );

  console.log("Done!");
  return imagePath;
}

// Example usage
editAndSend("wearing a cyberpunk outfit with neon lights", "#general", "auto", "New fit 🔥");
```

**Step 2: Verify both files are identical**

```bash
diff scripts/clawra-selfie.ts skill/scripts/clawra-selfie.ts
```
Expected: no output.

**Step 3: Commit**

```bash
git add scripts/clawra-selfie.ts skill/scripts/clawra-selfie.ts
git commit -m "feat: replace @fal-ai/client with nano-banana-pro in TypeScript script"
```

---

### Task 5: Update bin/cli.js installer

**Files:**
- Modify: `bin/cli.js`

**Step 1: Remove FAL_KEY step, add OPENROUTER_API_KEY**

Find the `getFalApiKey` function (around line 211) and replace it entirely with:

```javascript
async function getOpenRouterApiKey(rl) {
  logStep("2/7", "Setting up OpenRouter API key...");

  const OPENROUTER_URL = "https://openrouter.ai/keys";

  log(`\nTo use nano-banana-pro (Gemini 3 Pro Image), you need an OpenRouter API key.`);
  log(`${c("cyan", "→")} Get your key from: ${c("bright", OPENROUTER_URL)}\n`);

  const openIt = await ask(rl, "Open OpenRouter in browser? (Y/n): ");

  if (openIt.toLowerCase() !== "n") {
    logInfo("Opening browser...");
    if (!openBrowser(OPENROUTER_URL)) {
      logWarn("Could not open browser automatically");
      logInfo(`Please visit: ${OPENROUTER_URL}`);
    }
  }

  log("");
  const apiKey = await ask(rl, "Enter your OPENROUTER_API_KEY: ");

  if (!apiKey) {
    logError("OPENROUTER_API_KEY is required!");
    return null;
  }

  if (apiKey.length < 10) {
    logWarn("That key looks too short. Make sure you copied the full key.");
  }

  logSuccess("API key received");
  return apiKey;
}
```

**Step 2: Update updateOpenClawConfig to use OPENROUTER_API_KEY**

Find `updateOpenClawConfig(falKey)` and rename parameter + update the config object:

```javascript
async function updateOpenClawConfig(openRouterKey) {
  logStep("4/7", "Updating OpenClaw configuration...");

  let config = readJsonFile(OPENCLAW_CONFIG) || {};

  const skillConfig = {
    skills: {
      entries: {
        [SKILL_NAME]: {
          enabled: true,
          env: {
            OPENROUTER_API_KEY: openRouterKey,
          },
        },
      },
    },
  };
  // ... rest of function unchanged
```

**Step 3: Update main() to call the renamed function**

In `main()`, find:
```javascript
const falKey = await getFalApiKey(rl);
if (!falKey) {
```
Replace with:
```javascript
const openRouterKey = await getOpenRouterApiKey(rl);
if (!openRouterKey) {
```

And:
```javascript
await updateOpenClawConfig(falKey);
```
Replace with:
```javascript
await updateOpenClawConfig(openRouterKey);
```

**Step 4: Update printSummary to remove FAL_KEY reference**

Find any mention of `FAL_KEY` in the summary output and replace with `OPENROUTER_API_KEY`.

**Step 5: Verify no remaining FAL_KEY references**

```bash
grep -n "FAL_KEY\|fal\.ai\|falKey\|getFalApiKey" bin/cli.js
```
Expected: no output.

**Step 6: Commit**

```bash
git add bin/cli.js
git commit -m "feat: replace FAL_KEY with OPENROUTER_API_KEY in installer"
```

---

### Task 6: Update README.md and CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Step 1: Update README.md**

- In **Prerequisites**: replace `fal.ai account` with `OpenRouter account (openrouter.ai)` and `nano-banana-pro skill installed in OpenClaw`
- In **Manual Installation > Configure OpenClaw**: replace `FAL_KEY` with `OPENROUTER_API_KEY`
- In **Technical Details**: replace `Image Generation: xAI Grok Imagine via fal.ai` with `Image Generation: Gemini 3 Pro Image via OpenRouter (nano-banana-pro skill)`
- In the supported platforms table: add Feishu row `| Feishu (飞书) | open_chat_id or user_id | oc_xxxxxx |`

**Step 2: Update CLAUDE.md**

In the **External Dependencies** section, replace:
```
- **fal.ai** (`https://fal.run/xai/grok-imagine-image/edit`) — image editing API; requires `FAL_KEY`
```
With:
```
- **nano-banana-pro** (OpenClaw skill at `~/.openclaw/workspace/skills/nano-banana-pro/`) — image editing via Gemini 3 Pro Image on OpenRouter; requires `OPENROUTER_API_KEY`
```

Also update the jsDelivr note: the reference image CDN URL is no longer used at runtime (image is read from local `assets/clawra.png`).

**Step 3: Verify no remaining fal.ai references outside of git history**

```bash
grep -rn "fal\.ai\|FAL_KEY\|fal-ai" --include="*.md" --include="*.js" --include="*.ts" --include="*.sh" --include="*.json" .
```
Expected: no output (or only in `docs/plans/` design files, which is fine).

**Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md for nano-banana-pro and Feishu"
```

---

## Verification Checklist

After all tasks are complete, run:

```bash
# 1. No fal.ai references in active code
grep -rn "fal\.ai\|FAL_KEY\|@fal-ai" --include="*.js" --include="*.ts" --include="*.sh" --include="*.json" --include="*.md" . | grep -v docs/plans

# 2. SKILL.md files are identical
diff SKILL.md skill/SKILL.md

# 3. Shell scripts are identical
diff scripts/clawra-selfie.sh skill/scripts/clawra-selfie.sh

# 4. TS scripts are identical
diff scripts/clawra-selfie.ts skill/scripts/clawra-selfie.ts

# 5. OPENROUTER_API_KEY present in installer
grep "OPENROUTER_API_KEY" bin/cli.js

# 6. Feishu documented
grep -i "feishu\|飞书" SKILL.md README.md
```
