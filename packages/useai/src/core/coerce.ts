import { z } from "zod";

/**
 * Some MCP clients (e.g. Claude) serialize complex params as JSON strings
 * instead of native JSON objects. This transparently parses them before validation.
 */
export function coerceJsonString<T extends z.ZodTypeAny>(
  schema: T,
): z.ZodType<z.infer<T>> {
  return z.preprocess((val) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, schema) as z.ZodType<z.infer<T>>;
}
