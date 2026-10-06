import type { Mission, Plan, PlanInput, Setting } from './types';

export interface ActiveTrip { id: string; plan: Plan; startedAt: number; endsAt: number }
export interface JournalEntry { id: string; title: string; endedAt: number; minutes: number; feeling: string; note: string; missionTitles: string[]; mode: 'ai' | 'demo' }

export const JOURNAL_KEY = 'outward.journal.v1';
export const ACTIVE_KEY = 'outward.active.v1';
export const JOURNAL_LIMIT = 100;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_JOURNAL_BACKUP_BYTES = 2 * 1024 * 1024;
const MAX_DATE = 8_640_000_000_000_000;
const MAX_ACTIVE_CHARACTERS = 100_000;
const JOURNAL_FIELDS = ['id', 'title', 'endedAt', 'minutes', 'feeling', 'note', 'missionTitles', 'mode'];
type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;
type ActiveStorage = ReadableStorage & Partial<WritableStorage>;
type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function isText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
}
function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_DATE;
}
function isIsoDate(value: unknown): value is string {
  if (!isText(value, 32)) return false;
  const timestamp = Date.parse(value);
  return isTimestamp(timestamp) && new Date(timestamp).toISOString() === value;
}
function isSetting(value: unknown): value is Setting {
  return value === 'neighborhood' || value === 'park' || value === 'doorstep';
}
function hasOnlyFields(value: RecordValue, fields: string[]): boolean {
  return Object.keys(value).every(key => fields.includes(key));
}
function readEntry(value: unknown, strict = false): JournalEntry | null {
  if (!isRecord(value) || (strict && !hasOnlyFields(value, JOURNAL_FIELDS)) ||
    !isText(value.id, 128) || !isText(value.title, 300) || !isText(value.feeling, 100, true) ||
    !isText(value.note, MAX_NOTE_LENGTH, true) || !isTimestamp(value.endedAt) ||
    typeof value.minutes !== 'number' || !Number.isFinite(value.minutes) || value.minutes < 0 || value.minutes > MAX_DATE / 60000 ||
    !Array.isArray(value.missionTitles) || value.missionTitles.length < 1 || value.missionTitles.length > 3 ||
    !value.missionTitles.every(title => isText(title, 300)) || (value.mode !== 'ai' && value.mode !== 'demo')) return null;
  // Build a fresh, known shape. Never spread arbitrary JSON or carry hidden fields forward.
  return { id: value.id, title: value.title, endedAt: value.endedAt, minutes: value.minutes,
    feeling: value.feeling, note: value.note, missionTitles: [...value.missionTitles], mode: value.mode };
}
function sameEntry(left: JournalEntry, right: JournalEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Best-effort recovery never rewrites or removes the original journal. */
export function readJournal(storage?: ReadableStorage): JournalEntry[] {
  try {
    const raw = (storage ?? localStorage).getItem(JOURNAL_KEY);
    if (!raw || raw.length > MAX_JOURNAL_BACKUP_BYTES) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const entries: JournalEntry[] = [];
    const ids = new Set<string>();
    for (const value of data) {
      const entry = readEntry(value);
      if (entry && !ids.has(entry.id)) { entries.push(entry); ids.add(entry.id); }
      if (entries.length === JOURNAL_LIMIT) break;
    }
    return entries;
  } catch { return []; }
}

/** Validate the entire file before the caller changes any local state. Errors are safe to show in the UI. */
export function parseJournalBackup(text: string): JournalEntry[] {
  if (typeof text !== 'string') throw new Error('Choose an Outward JSON backup file.');
  if (text.length > MAX_JOURNAL_BACKUP_BYTES || new TextEncoder().encode(text).byteLength > MAX_JOURNAL_BACKUP_BYTES) {
    throw new Error('This backup is too large. Choose a file smaller than 2 MB.');
  }
  if (!text.trim()) throw new Error('Choose an Outward JSON backup file.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose an exported Outward backup.'); }
  if (!isRecord(data) || data.app !== 'Outward' || data.version !== 1 || !isIsoDate(data.exportedAt) ||
    !hasOnlyFields(data, ['app', 'version', 'exportedAt', 'entries']) || !Array.isArray(data.entries)) {
    throw new Error('This file is not a supported Outward version 1 backup.');
  }
  if (data.entries.length > JOURNAL_LIMIT) throw new Error(`This backup has more than ${JOURNAL_LIMIT} notes. Nothing was imported.`);
  const entries = data.entries.map((value, index) => {
    const entry = readEntry(value, true);
    if (!entry) throw new Error(`Note ${index + 1} has missing or invalid fields. Notes must be at most ${MAX_NOTE_LENGTH} characters. Nothing was imported.`);
    return entry;
  });
  // Check conflicts, but leave ordering and deduplication to the explicit merge step.
  mergeJournalEntries([], entries);
  return entries;
}

/** Preserve existing notes; duplicate identical IDs are safe, conflicting copies require a choice. */
export function mergeJournalEntries(current: JournalEntry[], incoming: JournalEntry[]): JournalEntry[] {
  if (!Array.isArray(current) || !Array.isArray(incoming)) throw new Error('The field notes could not be read. Nothing was changed.');
  if (current.length > JOURNAL_LIMIT || incoming.length > JOURNAL_LIMIT) {
    throw new Error(`You can keep up to ${JOURNAL_LIMIT} notes in this browser. Export your notes before making room. Nothing was changed.`);
  }
  const entries = new Map<string, JournalEntry>();
  for (const value of [...current, ...incoming]) {
    const entry = readEntry(value, true);
    if (!entry) throw new Error('A field note has invalid data. Nothing was changed.');
    const existing = entries.get(entry.id);
    if (existing && !sameEntry(existing, entry)) {
      throw new Error('This backup contains a different version of an existing note. Your original notes were kept; resolve the duplicate before importing.');
    }
    if (!existing) entries.set(entry.id, entry);
  }
  if (entries.size > JOURNAL_LIMIT) {
    throw new Error(`This would exceed the ${JOURNAL_LIMIT}-note limit. Export your notes before making room. Nothing was imported.`);
  }
  return [...entries.values()].sort((a, b) => b.endedAt - a.endedAt);
}

function readMission(value: unknown): Mission | null {
  if (!isRecord(value) || !isText(value.id, 128) || !isText(value.title, 300) || !isText(value.kicker, 100) ||
    !isText(value.description, 2000) || !isText(value.instruction, 4000) || !isText(value.reflection, 1000) ||
    !isText(value.intent, 2000) || !Array.isArray(value.tags) || value.tags.length > 30 ||
    !value.tags.every(tag => isText(tag, 100)) || !Array.isArray(value.settings) ||
    value.settings.length < 1 || value.settings.length > 3 || !value.settings.every(isSetting) ||
    typeof value.stationary !== 'boolean' || typeof value.category !== 'string' ||
    !['listen', 'light', 'detail', 'sky', 'movement', 'perspective'].includes(value.category)) return null;
  return { id: value.id, title: value.title, kicker: value.kicker, description: value.description,
    instruction: value.instruction, reflection: value.reflection, intent: value.intent, tags: [...value.tags],
    settings: [...value.settings], stationary: value.stationary, category: value.category as Mission['category'] };
}

function sanitizedActive(value: unknown): ActiveTrip | null {
  if (!isRecord(value) || !isText(value.id, 128) || !isTimestamp(value.startedAt) || !isTimestamp(value.endsAt) ||
    value.endsAt <= value.startedAt || !isRecord(value.plan)) return null;
  const plan = value.plan;
  const input = plan.input;
  if (!isRecord(input) || !isText(input.mood, 500, true) || !isSetting(input.setting) ||
    (input.duration !== 10 && input.duration !== 20 && input.duration !== 30) ||
    (input.pace !== 'wander' && input.pace !== 'stay') ||
    (input.excludeListening !== undefined && typeof input.excludeListening !== 'boolean') ||
    value.endsAt - value.startedAt !== input.duration * 60000 ||
    (plan.mode !== 'ai' && plan.mode !== 'demo') || !isText(plan.query, 1000, true) ||
    (plan.model !== null && !isText(plan.model, 200)) || !isIsoDate(plan.createdAt) ||
    !isRecord(plan.similarities) || Object.keys(plan.similarities).length > 100 ||
    !Object.entries(plan.similarities).every(([key, score]) => isText(key, 128) && typeof score === 'number' && Number.isFinite(score)) ||
    !Array.isArray(plan.missions) || plan.missions.length !== 3) return null;
  const missions = plan.missions.map(readMission);
  if (!missions.every((mission): mission is Mission => mission !== null) ||
    new Set(missions.map(mission => mission.id)).size !== 3 ||
    !missions.every(mission => mission.settings.includes(input.setting as Setting) &&
      (input.pace !== 'stay' || mission.stationary) && (!input.excludeListening || mission.category !== 'listen'))) return null;
  const cleanInput: PlanInput = { mood: '', setting: input.setting, duration: input.duration, pace: input.pace,
    ...(input.excludeListening === undefined ? {} : { excludeListening: input.excludeListening }) };
  return { id: value.id, startedAt: value.startedAt, endsAt: value.endsAt,
    plan: { missions, mode: plan.mode, model: null, input: cleanInput, query: '', similarities: {}, createdAt: plan.createdAt } };
}

/** Restore only a complete trip. Upgrade old records without restoring their original free-text input. */
export function readActive(storage?: ActiveStorage): ActiveTrip | null {
  try {
    const target = storage ?? localStorage;
    const raw = target.getItem(ACTIVE_KEY);
    if (!raw || raw.length > MAX_ACTIVE_CHARACTERS) return null;
    const trip = sanitizedActive(JSON.parse(raw));
    if (!trip) return null;
    const sanitized = JSON.stringify(trip);
    if (raw !== sanitized && target.setItem) {
      // If storage is blocked, the active trip is still usable in memory.
      try { target.setItem(ACTIVE_KEY, sanitized); } catch { /* Preserve the only persisted copy on failure. */ }
    }
    return trip;
  } catch { return null; }
}

export function saveActiveTrip(trip: ActiveTrip, storage?: WritableStorage): boolean {
  try {
    const sanitized = sanitizedActive(trip);
    if (!sanitized) return false;
    (storage ?? localStorage).setItem(ACTIVE_KEY, JSON.stringify(sanitized));
    return true;
  } catch { return false; }
}

export function saveLocal(key: string, value: unknown, storage?: WritableStorage): boolean {
  // Keep old callers privacy-safe too; arbitrary trip input never reaches storage.
  if (key === ACTIVE_KEY) return saveActiveTrip(value as ActiveTrip, storage);
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return false;
    (storage ?? localStorage).setItem(key, serialized);
    return true;
  } catch { return false; }
}

export function remainingSeconds(endsAt: number, now = Date.now()) {
  return isTimestamp(endsAt) && isTimestamp(now) ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}
export function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, '0')}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
}
export function elapsedMinutes(startedAt: number, now = Date.now()) {
  return isTimestamp(startedAt) && isTimestamp(now) ? Math.max(0, Math.round((now - startedAt) / 60000)) : 0;
}
