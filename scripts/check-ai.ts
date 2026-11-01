import { readFile } from "node:fs/promises";
import { evaluatePhoto, describeProvider } from "../src/server/ai/evaluator";
import { prepareModelImage } from "../src/server/media/process";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: pnpm media:check <path-to-image>");
    process.exit(1);
  }

  const provider = describeProvider();
  console.log(`→ provider=${provider.id} model=${provider.model}`);

  try {
    const buffer = await readFile(file);
    const modelImage = await prepareModelImage(buffer);
    const started = Date.now();
    const result = await evaluatePhoto(modelImage, {
      title: file.split("/").pop() ?? "test",
      theme: "trail",
      isHikingContext: true,
    });
    console.log(`✓ ${((Date.now() - started) / 1000).toFixed(1)}s · score ${result.score}/5`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
