
import type { EngineResult as ApiEngineResult } from "@/types/api-types";
import type { QuestionnaireData } from "@/schemas/questionnaireSchema";
import type { PlanResult } from "./plan-result-context";
import {
  adaptEngineResult,
  type EngineResult as AdapterEngineResult,
} from "./adapter";

/**
 * Validates the outer response shape, adapts it for Comparison,
 * and retains the original response for Final Report and exports.
 */
export function adaptEngineResponse(
  body: unknown,
  questionnaireData: QuestionnaireData,
): PlanResult {
  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { plans?: unknown }).plans) ||
    typeof (body as { generatedAt?: unknown }).generatedAt !== "string"
  ) {
    throw new Error("Unexpected /generate response shape");
  }

  const engineResult = body as ApiEngineResult;
  const adapted = adaptEngineResult(body as AdapterEngineResult);

  return {
    engineResult,
    questionnaireData,
    ...adapted,
  };
}
