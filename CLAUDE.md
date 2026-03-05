# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Clawra** is an npm package that installs a "selfie skill" into an OpenClaw agent. Running `npx clawra@latest` walks the user through setup interactively. The installed skill lets an OpenClaw agent generate and send selfie images using Gemini 3 Pro Image via OpenRouter (nano-banana-pro skill).

## Common Commands

```bash
# Run the installer locally (requires OpenClaw to be installed)
node bin/cli.js

# Install devDependencies (TypeScript)
npm install

# Run the TypeScript script directly
npx ts-node scripts/clawra-selfie.ts

# Test the shell script
OPENROUTER_API_KEY=your_key bash scripts/clawra-selfie.sh "wearing a cowboy hat" "#general"

# Publish to npm
npm publish
```

## Architecture

The repo has two distinct layers:

1. **Installer** (`bin/cli.js`) — a standalone Node.js CLI with zero runtime dependencies. It runs the 7-step interactive setup:
   - Checks OpenClaw is installed
   - Prompts for an OpenRouter API key
   - Copies `skill/` → `~/.openclaw/skills/clawra-selfie/`
   - Merges skill config (with `OPENROUTER_API_KEY`) into `~/.openclaw/openclaw.json`
   - Writes `~/.openclaw/workspace/IDENTITY.md` with Clawra's persona
   - Injects `templates/soul-injection.md` into `~/.openclaw/workspace/SOUL.md`

2. **Skill** (`skill/` and root `SKILL.md`) — the OpenClaw skill definition. Once installed, OpenClaw's agent reads `SKILL.md` to know when and how to generate selfies. The skill:
   - Calls the nano-banana-pro skill which uses Gemini 3 Pro Image via OpenRouter, with a local reference image (`assets/clawra.png`)
   - Auto-selects "mirror" (outfit/full-body) or "direct" (portrait/location) prompt mode based on keywords
   - Sends the resulting image URL via `openclaw message send` to any supported platform

The `skill/` directory is what gets copied to the user's machine. `SKILL.md` at root and `skill/SKILL.md` are identical — the root copy is a fallback used during development when `skill/` doesn't exist yet.

## Key Files

| File | Purpose |
|------|---------|
| `bin/cli.js` | Interactive installer (the `npx clawra` entrypoint) |
| `skill/SKILL.md` | OpenClaw skill definition — defines triggers, prompt modes, API calls |
| `skill/scripts/clawra-selfie.sh` | Bash implementation of image edit + send |
| `skill/scripts/clawra-selfie.ts` | TypeScript implementation using OpenRouter API |
| `templates/soul-injection.md` | Persona text injected into the agent's SOUL.md |
| `assets/clawra.png` | The fixed reference image (also served via jsDelivr CDN) |

## External Dependencies

- **nano-banana-pro** (OpenClaw skill at `~/.openclaw/workspace/skills/nano-banana-pro/`) — image editing via Gemini 3 Pro Image on OpenRouter; requires `OPENROUTER_API_KEY`
- **OpenClaw CLI** (`openclaw message send`) — messaging gateway; requires `OPENCLAW_GATEWAY_TOKEN`
- **Reference image** — read from local `assets/clawra.png` (the jsDelivr CDN URL is no longer used at runtime)

The installer has zero runtime npm dependencies. TypeScript is a devDependency only used for the `.ts` script.
