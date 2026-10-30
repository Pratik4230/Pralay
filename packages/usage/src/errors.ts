export class InsufficientCreditsError extends Error {
  readonly code = "insufficient_credits";

  constructor(
    public readonly available: number,
    public readonly required: number,
  ) {
    super(
      `This workspace needs ${required.toLocaleString()} available credits but has ${available.toLocaleString()}.`,
    );
    this.name = "InsufficientCreditsError";
  }
}
