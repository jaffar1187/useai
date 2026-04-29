export interface DimensionRubric {
  dimension: string;
  label: string;
  spaceMapping: string;
  weight: number;
  levels: Record<number, string>;
}

export interface EvaluationFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  rubrics: DimensionRubric[];
}

const rubrics: DimensionRubric[] = [
  {
    dimension: "promptQuality",
    label: "Prompt Quality",
    spaceMapping: "Communication",
    weight: 0.3,
    levels: {
      1: "Vague, no goal stated, AI must guess intent entirely",
      2: "Goal implied but ambiguous, missing key constraints",
      3: "Clear goal, some constraints provided, missing edge cases",
      4: "Clear goal with constraints, minor ambiguity remains",
      5: "Crystal clear goal, all constraints stated, acceptance criteria defined",
    },
  },
  {
    dimension: "contextProvided",
    label: "Context Provided",
    spaceMapping: "Communication",
    weight: 0.25,
    levels: {
      1: "No context provided \u2014 no files, errors, or background",
      2: "Minimal context \u2014 vague references without specifics",
      3: "Some files or errors provided but incomplete picture",
      4: "Good context with relevant files, errors, and background",
      5: "Comprehensive context: files, errors, constraints, and expected behavior",
    },
  },
  {
    dimension: "independenceLevel",
    label: "Independence Level",
    spaceMapping: "Efficiency",
    weight: 0.25,
    levels: {
      1: "Needed constant guidance, every step required approval",
      2: "Frequent back-and-forth, many clarifying questions needed",
      3: "Some back-and-forth on approach, core decisions made by user",
      4: "Mostly self-directed, only major decisions needed input",
      5: "Gave clear spec, AI executed autonomously with minimal interruption",
    },
  },
  {
    dimension: "scopeQuality",
    label: "Scope Quality",
    spaceMapping: "Performance",
    weight: 0.2,
    levels: {
      1: "Vague or impossibly broad \u2014 no clear deliverable",
      2: "Poorly defined \u2014 scope creep likely, unclear boundaries",
      3: "Reasonable scope with some ambiguity in deliverables",
      4: "Well-scoped with clear deliverables, minor gaps",
      5: "Precise, achievable, well-decomposed into actionable steps",
    },
  },
];

export const spaceFramework: EvaluationFramework = {
  id: "space",
  name: "SPACE",
  description:
    "Based on the SPACE developer productivity framework (GitHub/Microsoft Research). Weighted rubrics with explicit per-level criteria.",
  version: "1.0.0",
  rubrics,
};
