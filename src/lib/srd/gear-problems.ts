// Stable diagnostic codes for the character builder's starting-gear checks.
// Human-readable legacy messages remain alongside these details for API and
// non-UI consumers; the UI translates only the code and its parameters.
export type GearProblemDetail = {
  code: string;
  params: Record<string, string | number>;
};
