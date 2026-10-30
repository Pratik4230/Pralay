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

export class ProjectBudgetExceededError extends Error {
  readonly code = "project_budget_exceeded";

  constructor(
    public readonly available: number,
    public readonly required: number,
  ) {
    super(
      `This project needs ${required.toLocaleString()} available monthly credits but has ${available.toLocaleString()}.`,
    );
    this.name = "ProjectBudgetExceededError";
  }
}
