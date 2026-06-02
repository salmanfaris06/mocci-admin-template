import { describe, expect, it } from "vitest";
import { calculateTokenCostUsd } from "./costing";

describe("calculateTokenCostUsd", () => {
  it("calculates input and output token cost using per-million prices", () => {
    expect(calculateTokenCostUsd({ inputTokens: 1000, outputTokens: 500, inputPricePerMillion: "0.400000", outputPricePerMillion: "1.600000" })).toBe("0.001200");
  });

  it("returns zero cost for zero tokens", () => {
    expect(calculateTokenCostUsd({ inputTokens: 0, outputTokens: 0, inputPricePerMillion: "0.400000", outputPricePerMillion: "1.600000" })).toBe("0.000000");
  });
});
