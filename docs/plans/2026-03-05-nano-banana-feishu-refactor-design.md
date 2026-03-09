# Design: Replace fal.ai with nano-banana-pro + Add Feishu Support

Date: 2026-03-05

## Overview

Refactor the clawra-selfie skill to replace fal.ai image editing with the locally installed nano-banana-pro skill (Gemini 3 Pro Image via OpenRouter), and document Feishu as a supported messaging platform (already natively supported by OpenClaw).

## Goals

1. Remove all fal.ai / `FAL_KEY` dependencies
2. Use `nano-banana-pro` (`uv run generate_image.py`) for image editing
3. Document Feishu channel format in SKILL.md and README

## Architecture Changes

### Image Generation Flow

**Before:**
```
prompt → curl fal.ai API (FAL_KEY) → image URL → openclaw --media <URL>
```

**After:**
```
prompt → uv run nano-banana-pro/scripts/generate_image.py -i assets/clawra.png → local file path → openclaw --media <local_path>
```

Key differences:
- Input reference image is read from local disk (`{baseDir}/assets/clawra.png`) instead of CDN URL
- Output is a local file path (printed as `MEDIA: <path>` by the script), not a remote URL
- Auth via `OPENROUTER_API_KEY` instead of `FAL_KEY`
- nano-banana-pro must be installed at one of the known paths (see below)

### nano-banana-pro Path Resolution

Scripts will search in order:
1. `~/.openclaw/workspace/skills/nano-banana-pro/scripts/generate_image.py`
2. `~/.openclaw/skills/nano-banana-pro/scripts/generate_image.py`

If not found, exit with a clear error message instructing the user to install nano-banana-pro.

### Output File Naming

Generated selfies saved to `/tmp/` with timestamp filenames:
```
/tmp/YYYY-MM-DD-HH-MM-SS-clawra-selfie.png
```

### Feishu Support

No code changes required. OpenClaw natively supports Feishu. Add to supported platforms table in SKILL.md and README:

| Platform | Channel Format | Example |
|----------|----------------|---------|
| Feishu (飞书) | `open_chat_id` or `user_id` | `oc_xxxxxx` |

## Files to Modify

| File | Change |
|------|--------|
| `SKILL.md` + `skill/SKILL.md` | Replace fal.ai workflow with nano-banana-pro; update env vars; add `Bash(uv:*)`; add Feishu docs |
| `scripts/clawra-selfie.sh` + `skill/scripts/clawra-selfie.sh` | Replace curl/fal.ai with uv run; extract local path from MEDIA: output; pass to openclaw |
| `scripts/clawra-selfie.ts` + `skill/scripts/clawra-selfie.ts` | Remove `@fal-ai/client`; use execAsync to call nano-banana-pro script |
| `bin/cli.js` | Replace FAL_KEY prompt/config with OPENROUTER_API_KEY |
| `package.json` | Remove `@fal-ai/client` from devDependencies |
| `README.md` | Update prerequisites, config, and supported platforms |
| `CLAUDE.md` | Update external dependencies section |

## Environment Variables

| Variable | Old | New |
|----------|-----|-----|
| `FAL_KEY` | Required | Removed |
| `OPENROUTER_API_KEY` | Not used | Required |
| `OPENCLAW_GATEWAY_TOKEN` | Required | Required (unchanged) |
