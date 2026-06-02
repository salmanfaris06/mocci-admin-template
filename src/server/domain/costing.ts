type CalculateTokenCostInput = {
  inputTokens: number;
  outputTokens: number;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
};

export function calculateTokenCostUsd(input: CalculateTokenCostInput) {
  const inputCost = (input.inputTokens / 1_000_000) * Number(input.inputPricePerMillion);
  const outputCost = (input.outputTokens / 1_000_000) * Number(input.outputPricePerMillion);
  return (inputCost + outputCost).toFixed(6);
}
