export type Setting = 'neighborhood' | 'park' | 'doorstep';
export type Duration = 10 | 20 | 30;
export type Pace = 'wander' | 'stay';
export type PlanMode = 'ai' | 'demo';
export type MissionCategory = 'listen' | 'light' | 'detail' | 'sky' | 'movement' | 'perspective';

export interface Mission {
  id: string;
  title: string;
  kicker: string;
  description: string;
  instruction: string;
  reflection: string;
  tags: string[];
  settings: Setting[];
  stationary: boolean;
  category: MissionCategory;
  /** Curated matching context, embedded with the task. Never a diagnosis. */
  intent: string;
}

export interface PlanInput {
  mood: string;
  setting: Setting;
  duration: Duration;
  pace: Pace;
  /** Excludes the catalog's listening activities; no hearing ability is inferred. */
  excludeListening?: boolean;
}

export interface Plan {
  missions: Mission[];
  mode: PlanMode;
  model: string | null;
  query: string;
  input: PlanInput;
  /** Raw cosine similarities in AI mode, lexical overlap scores in demo mode. */
  similarities: Record<string, number>;
  createdAt: string;
}

export interface ModelProgress {
  stage: 'loading' | 'embedding' | 'ranking' | 'ready';
  message: string;
  /** Current-step percentage, 0–100; model-file downloads are not overall readiness. */
  progress?: number;
}

export interface MissionSelectionOptions {
  /** Hard, request-only exclusions for another set; never saved with the plan input. */
  excludeMissionIds?: string[];
}

export interface CreatePlanOptions extends MissionSelectionOptions {
  mode?: PlanMode;
  onProgress?: (progress: ModelProgress) => void;
  signal?: AbortSignal;
  /** Total AI deadline including download and inference; default 90 seconds, maximum 10 minutes. */
  timeoutMs?: number;
}
