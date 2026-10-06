import { missions } from '../data/missions.ts';
import type { Mission, MissionSelectionOptions, Plan, PlanInput } from '../types.ts';

export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const MODEL_REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';
export const MAX_MOOD_LENGTH = 500;

export function validateInput(input: PlanInput): PlanInput {
  if (!input || typeof input.mood !== 'string') throw new Error('Tell us what is on your mind first.');
  if (!['neighborhood', 'park', 'doorstep'].includes(input.setting)) throw new Error('Choose a valid place.');
  if (![10, 20, 30].includes(input.duration)) throw new Error('Choose 10, 20, or 30 minutes.');
  if (!['wander', 'stay'].includes(input.pace)) throw new Error('Choose a valid pace.');
  if (input.excludeListening !== undefined && typeof input.excludeListening !== 'boolean') throw new Error('Choose whether to skip listening activities.');
  if (input.mood.length > MAX_MOOD_LENGTH) throw new Error(`Keep your note under ${MAX_MOOD_LENGTH + 1} characters.`);
  return {
    mood: input.mood.trim(), setting: input.setting, duration: input.duration, pace: input.pace,
    ...(input.excludeListening === undefined ? {} : { excludeListening: input.excludeListening }),
  };
}

export function buildQuery(input: PlanInput): string {
  return input.mood.trim() || 'I want a gentle outdoor pause and to notice the world around me.';
}

export function missionText(mission: Mission): string {
  return `${mission.intent} ${mission.title}. ${mission.description} ${mission.tags.join(', ')}.`;
}

export function validateSelectionOptions(options: MissionSelectionOptions = {}): MissionSelectionOptions {
  if (options.excludeMissionIds === undefined) return {};
  if (!Array.isArray(options.excludeMissionIds) || options.excludeMissionIds.some((id) => typeof id !== 'string')) {
    throw new Error('Choose valid missions to leave out of this set.');
  }
  return { excludeMissionIds: [...new Set(options.excludeMissionIds)] };
}

export function eligibleMissions(input: PlanInput, options: MissionSelectionOptions = {}): Mission[] {
  const excluded = new Set(validateSelectionOptions(options).excludeMissionIds);
  return missions.filter((mission) =>
    mission.settings.includes(input.setting) &&
    (input.pace !== 'stay' || mission.stationary) &&
    (!input.excludeListening || mission.category !== 'listen') &&
    !excluded.has(mission.id),
  );
}

function requireThreeMissions(eligible: Mission[], options: MissionSelectionOptions) {
  if (eligible.length < 3) {
    throw new Error(options.excludeMissionIds?.length
      ? 'There are not enough different missions for these choices. Start a new plan to include earlier missions again.'
      : 'There are not enough reviewed missions for these choices.');
  }
}

export function cosineSimilarity(left: ArrayLike<number>, right: ArrayLike<number>): number {
  if (!left.length || left.length !== right.length) throw new Error('The model returned incompatible embeddings.');
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < left.length; i += 1) {
    if (!Number.isFinite(left[i]) || !Number.isFinite(right[i])) throw new Error('The model returned an invalid embedding.');
    dot += left[i] * right[i];
    leftNorm += left[i] ** 2;
    rightNorm += right[i] ** 2;
  }
  if (!leftNorm || !rightNorm) throw new Error('The model returned an empty embedding.');
  return Math.max(-1, Math.min(1, dot / Math.sqrt(leftNorm * rightNorm)));
}

/** Query relevance drives selection; a small MMR penalty avoids three near-duplicates. */
export function selectSemanticMissions(
  input: PlanInput,
  queryEmbedding: ArrayLike<number>,
  embeddings: Record<string, ArrayLike<number>>,
  options: MissionSelectionOptions = {},
): Pick<Plan, 'missions' | 'similarities'> {
  const eligible = eligibleMissions(input, options);
  requireThreeMissions(eligible, options);
  const similarities: Record<string, number> = {};
  for (const mission of eligible) {
    if (!embeddings[mission.id]) throw new Error(`Missing the embedding for ${mission.id}.`);
    similarities[mission.id] = cosineSimilarity(queryEmbedding, embeddings[mission.id]);
  }
  const selected: Mission[] = [];
  while (selected.length < 3) {
    let best: Mission | undefined;
    let bestScore = -Infinity;
    for (const candidate of eligible) {
      if (selected.some((mission) => mission.id === candidate.id)) continue;
      const redundancy = selected.length
        ? Math.max(0, ...selected.map((mission) => cosineSimilarity(embeddings[candidate.id], embeddings[mission.id])))
        : 0;
      const categoryPenalty = selected.some((mission) => mission.category === candidate.category) ? 0.035 : 0;
      const score = similarities[candidate.id] - 0.15 * redundancy - categoryPenalty;
      if (score > bestScore) { best = candidate; bestScore = score; }
    }
    if (!best) throw new Error('We could not assemble a complete plan.');
    selected.push(best);
  }
  return { missions: selected, similarities };
}

export function createSemanticPlan(input: PlanInput, queryEmbedding: ArrayLike<number>, embeddings: Record<string, ArrayLike<number>>, options: MissionSelectionOptions = {}): Plan {
  const valid = validateInput(input);
  return {
    ...selectSemanticMissions(valid, queryEmbedding, embeddings, options),
    input: valid, query: buildQuery(valid), mode: 'ai', model: MODEL_ID, createdAt: new Date().toISOString(),
  };
}

function words(text: string): Set<string> {
  const stopwords = new Set(['this', 'that', 'with', 'have', 'want', 'feel', 'some', 'just', 'really', 'would', 'from', 'been', 'into', 'like', 'need', 'them', 'they', 'what', 'your', 'around']);
  return new Set((text.toLowerCase().match(/[a-z]{3,}/g) ?? []).map((word) => word.replace(/(ing|ed|s)$/, '')).filter((word) => !stopwords.has(word)));
}

/** Explicit offline preview. This is lexical matching, not model inference. */
export function createDemoPlan(input: PlanInput, options: MissionSelectionOptions = {}): Plan {
  const valid = validateInput(input);
  const query = buildQuery(valid);
  const queryWords = words(query);
  const eligible = eligibleMissions(valid, options);
  requireThreeMissions(eligible, options);
  const similarities: Record<string, number> = {};
  for (const mission of eligible) {
    const terms = words(missionText(mission));
    similarities[mission.id] = [...queryWords].filter((word) => terms.has(word)).length / Math.max(1, queryWords.size);
  }
  const selected: Mission[] = [];
  while (selected.length < 3) {
    const remaining = eligible.filter((mission) => !selected.includes(mission));
    remaining.sort((a, b) => {
      const score = (mission: Mission) => similarities[mission.id] - (selected.some((item) => item.category === mission.category) ? 0.08 : 0);
      return score(b) - score(a) || eligible.indexOf(a) - eligible.indexOf(b);
    });
    if (!remaining[0]) throw new Error('There are not enough reviewed missions for these choices.');
    selected.push(remaining[0]);
  }
  return { missions: selected, mode: 'demo', model: null, input: valid, query, similarities, createdAt: new Date().toISOString() };
}
