# Clawra
<img width="300"  alt="image" src="https://github.com/user-attachments/assets/41512c51-e61d-4550-b461-eed06a1b0ec8" />


## Quick Start

```bash
npx clawra@latest
```

This will:
1. Check OpenClaw is installed
2. Guide you to get an OpenRouter API key
3. Install the skill to `~/.openclaw/skills/clawra-selfie/`
4. Configure OpenClaw to use the skill
5. Add selfie capabilities to your agent's SOUL.md

## What It Does

Clawra Selfie enables your OpenClaw agent to:
- **Generate selfies** using a consistent reference image
- **Send photos** across all messaging platforms (Discord, Telegram, WhatsApp, etc.)
- **Respond visually** to "what are you doing?" and "send a pic" requests

### Selfie Modes

| Mode | Best For | Keywords |
|------|----------|----------|
| **Mirror** | Full-body shots, outfits | wearing, outfit, fashion |
| **Direct** | Close-ups, locations | cafe, beach, portrait, smile |

## Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and configured
- [OpenRouter](https://openrouter.ai) account (free tier available)
- `nano-banana-pro` skill installed in OpenClaw

## Manual Installation

If you prefer manual setup:

### 1. Get API Key

Visit [openrouter.ai/keys](https://openrouter.ai/keys) and create an API key.

### 2. Clone the Skill

```bash
git clone https://github.com/SumeLabs/clawra ~/.openclaw/skills/clawra-selfie
```

### 3. Configure OpenClaw

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "clawra-selfie": {
        "enabled": true,
        "env": {
          "OPENROUTER_API_KEY": "your_openrouter_key_here"
        }
      }
    }
  }
}
```

### 4. Update SOUL.md

Add the selfie persona to `~/.openclaw/workspace/SOUL.md`:

```markdown
## Clawra Selfie Capability

You have a physical appearance and can take selfies!
When users ask for pictures, use the clawra-selfie skill.
```

## Usage Examples

Once installed, your agent responds to:

```
"Send me a selfie"
"Send a pic wearing a cowboy hat"
"What are you doing right now?"
"Show me you at a coffee shop"
```

## Reference Image

The skill uses a fixed reference image hosted on CDN:

```
https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png
```

This ensures consistent appearance across all generated images.

## Technical Details

- **Image Generation**: Gemini 3 Pro Image via OpenRouter (nano-banana-pro skill)
- **Messaging**: OpenClaw Gateway API
- **Supported Platforms**:

| Platform | ID Type | Example |
|----------|---------|---------|
| Discord | channel_id | 123456789 |
| Telegram | chat_id | -100123456 |
| WhatsApp | phone number | +1234567890 |
| Slack | channel_id | C01234567 |
| Signal | phone number | +1234567890 |
| MS Teams | channel_id | 19:xxxxx |
| Feishu (飞书) | open_chat_id or user_id | oc_xxxxxx |

## Project Structure

```
clawra/
├── bin/
│   └── cli.js           # npx installer
├── skill/
│   ├── SKILL.md         # Skill definition
│   ├── scripts/         # Generation scripts
│   └── assets/          # Reference image
├── templates/
│   └── soul-injection.md # Persona template
└── package.json
```

## License

MIT
