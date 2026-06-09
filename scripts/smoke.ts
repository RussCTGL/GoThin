// Smoke test for the lib/ai layer. Loads .env, runs one real meal-parse call,
// prints the validated result + usage log. Run with: npm run smoke
import "dotenv/config";
import { parseMeal } from "../lib/ai/index";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to .env first.");
  process.exit(1);
}

const sample = "Breakfast: 2 eggs, 2 slices of toast, black coffee";
console.log("Input:", sample);

const result = await parseMeal(sample, "smoke-user");
console.log("Result:", JSON.stringify(result, null, 2));

if (!result.ok) {
  console.error(`\nParse failed (reason: ${result.reason}).`);
  process.exit(1);
}
console.log("\n✅ AI layer works end-to-end.");
