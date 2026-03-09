import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

const execFileAsync = promisify(execFile);

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
    return `a close-up selfie taken by herself at ${userContext}, direct eye contact with the camera, looking straight into the lens, eyes centered and clearly visible, face fully visible, no phone visible in the image`;
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

  const suffix = crypto.randomUUID().slice(0, 8);
  const outputFile = `/tmp/clawra-selfie-${suffix}.png`;

  console.log("Generating image with nano-banana-pro...");
  const { stdout } = await execFileAsync(
    "uv",
    ["run", nbpScript, "--prompt", prompt, "--filename", outputFile, "-i", referenceImage],
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
  await execFileAsync("openclaw", [
    "message", "send",
    "--action", "send",
    "--channel", channel,
    "--message", messageCaption,
    "--media", imagePath,
  ]);

  console.log("Done!");
  return imagePath;
}

// Example usage
editAndSend("wearing a cyberpunk outfit with neon lights", "#general", "auto", "New fit 🔥").catch(
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
