import type { MissionSelectionOptions, ModelProgress, Plan, PlanInput } from '../types.ts';

export interface MatchRequest { type: 'match'; id: number; input: PlanInput; options?: MissionSelectionOptions }
export type MatchResponse =
  | { type: 'progress'; id: number; progress: ModelProgress }
  | { type: 'result'; id: number; plan: Plan }
  | { type: 'error'; id: number; message: string };
