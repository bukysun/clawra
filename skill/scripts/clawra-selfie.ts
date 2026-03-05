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

  console.log("Generating image with nano-banana-pro...");
  const { stdout } = await execAsync(
    `uv run "${nbpScript}" --prompt "${prompt.replace(/"/g, '\\"')}" --filename "${outputFile}" -i "${referenceImage}"`,
    { env: { ...process.env, OPENROUTER_API_KEY: apiKey } }
  );

  console.log(stdout);

  const mediaLine = stdout.split("\n").find((l) => l.trimStart().startsWith("MEDIA:"));
  if (!mediaLine) throw new Error("nano-banana-pro did not output a MEDIA: line");
  const imagePath = mediaLine.replace(/^MEDIA:\s*/, "").trim();

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
