import type {
  RunInput,
  FunctionRunResult,
  FunctionError,
} from "../generated/api";

export function run(input: RunInput): FunctionRunResult {
  const errors: FunctionError[] = input.cart.lines
    .filter(({ quantity }) => quantity < 2)
    .map(() => ({
      localizedMessage: "2個以上の商品をカートに入れてください",
      target: "cart",
    }));

  return {
    errors,
  };
}
