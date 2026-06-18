import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const testSchema = z.object({
  key: z.string()
}); // NO .strict()

try {
  const format = zodResponseFormat(testSchema, "test_schema");
  console.log("Success:", JSON.stringify(format, null, 2));
} catch (e: any) {
  console.error("Error:", e.message);
}
