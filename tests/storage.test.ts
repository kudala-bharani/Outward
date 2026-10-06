import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoPlan } from '../src/ai/rank';
import {
  ACTIVE_KEY, JOURNAL_KEY, JOURNAL_LIMIT, MAX_JOURNAL_BACKUP_BYTES, MAX_NOTE_LENGTH,
  elapsedMinutes, formatTime, mergeJournalEntries, parseJournalBackup, readActive, readJournal,
  remainingSeconds, saveActiveTrip, saveLocal,
} from '../src/storage';
import type { ActiveTrip, JournalEntry } from '../src/storage';

const now = Date.parse('2026-10-06T00:00:00.000Z');
function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return { id: 'note-1', title: 'A little light', endedAt: now, minutes: 20, feeling: 'More present',
    note: 'A sunbeam crossed the wall.', missionTitles: ['Light', 'Sky', 'Sound'], mode: 'demo', ...overrides };
}
function trip(): ActiveTrip {
  return { id: 'trip-1', startedAt: now, endsAt: now + 20 * 60000,
    plan: structuredClone(createDemoPlan({ mood: 'My private original thoughts', duration: 20, setting: 'neighborhood', pace: 'wander' })) };
}
function memoryStorage(value?: string, key = ACTIVE_KEY) {
  const data = new Map<string, string>(value === undefined ? [] : [[key, value]]);
  return { data, getItem: vi.fn((name: string) => data.get(name) ?? null),
    setItem: vi.fn((name: string, text: string) => { data.set(name, text); }) };
}
function backup(entries: unknown[] = [entry()], overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ app: 'Outward', version: 1, exportedAt: '2026-10-06T00:00:00.000Z', entries, ...overrides });
}
function readStoredTrip(value: unknown) {
  return readActive({ getItem: () => JSON.stringify(value) });
}

afterEach(() => vi.unstubAllGlobals());

describe('local storage recovery', () => {
  it('recovers from corrupted, missing, or denied storage', () => {
    expect(readJournal({ getItem: () => '{bad' })).toEqual([]);
    expect(readActive({ getItem: () => '{bad' })).toBeNull();
    expect(readJournal({ getItem: () => { throw Error('denied'); } })).toEqual([]);
    expect(readActive({ getItem: () => { throw Error('denied'); } })).toBeNull();
    expect(readJournal(memoryStorage())).toEqual([]);
    expect(readActive(memoryStorage())).toBeNull();
  });
  it('handles unavailable browser globals, including during initialization', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readJournal()).toEqual([]);
    expect(readActive()).toBeNull();
    expect(saveActiveTrip(trip())).toBe(false);
    expect(saveLocal(JOURNAL_KEY, [entry()])).toBe(false);
  });
  it('recovers valid notes without rewriting corrupt original data', () => {
    const storage = memoryStorage(JSON.stringify([{ id: 'bad' }, entry(), null]), JOURNAL_KEY);
    expect(readJournal(storage)).toEqual([entry()]);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.data.get(JOURNAL_KEY)).toContain('bad');
  });
  it.each([null, {}, 'hello', [{ id: 'bad' }], [entry({ minutes: Infinity })], [entry({ endedAt: -1 })],
    [entry({ note: 'a'.repeat(MAX_NOTE_LENGTH + 1) })]])('rejects malformed history: %j', value => {
    expect(readJournal({ getItem: () => JSON.stringify(value) })).toEqual([]);
  });
  it('bounds recovered history and prevents duplicate React keys', () => {
    const entries = Array.from({ length: 110 }, (_, i) => entry({ id: `note-${i}` }));
    expect(readJournal({ getItem: () => JSON.stringify([entries[0], ...entries]) })).toHaveLength(JOURNAL_LIMIT);
  });
  it('rejects oversized stored journal and active values before parsing', () => {
    expect(readJournal({ getItem: () => ' '.repeat(MAX_JOURNAL_BACKUP_BYTES + 1) })).toEqual([]);
    expect(readActive({ getItem: () => ' '.repeat(100001) })).toBeNull();
  });
  it('handles saving errors and unserializable values without clobbering stored data', () => {
    expect(saveLocal('a', {}, { setItem: () => { throw Error('quota'); } })).toBe(false);
    const storage = memoryStorage('keep', 'a');
    const circular: Record<string, unknown> = {}; circular.self = circular;
    expect(saveLocal('a', circular, storage)).toBe(false);
    expect(saveLocal('a', undefined, storage)).toBe(false);
    expect(storage.data.get('a')).toBe('keep');
    expect(saveLocal('a', { good: true }, storage)).toBe(true);
    expect(storage.data.get('a')).toBe('{"good":true}');
  });
});

describe('private active trip persistence', () => {
  it('persists only sanitized trip data without changing the runtime plan', () => {
    const active = trip();
    const original = structuredClone(active);
    const storage = memoryStorage();
    expect(saveActiveTrip(active, storage)).toBe(true);
    const stored = JSON.parse(storage.data.get(ACTIVE_KEY)!);
    expect(stored.plan.input).toEqual({ ...active.plan.input, mood: '' });
    expect(stored.plan.query).toBe('');
    expect(stored.plan.similarities).toEqual({});
    expect(stored.plan.model).toBeNull();
    expect(stored.plan.missions).toEqual(active.plan.missions);
    expect(storage.data.get(ACTIVE_KEY)).not.toContain(active.plan.input.mood);
    expect(active).toEqual(original);
    expect(readActive(storage)).toEqual(stored);
  });
  it.each([true, false])('preserves the skip-listening preference when it is %s', excludeListening => {
    const active = trip();
    active.plan = structuredClone(createDemoPlan({ ...active.plan.input, excludeListening }));
    const storage = memoryStorage();
    expect(saveActiveTrip(active, storage)).toBe(true);
    expect(JSON.parse(storage.data.get(ACTIVE_KEY)!).plan.input.excludeListening).toBe(excludeListening);
    expect(readActive(storage)?.plan.input.excludeListening).toBe(excludeListening);
    const legacyStorage = memoryStorage(JSON.stringify(active));
    expect(readActive(legacyStorage)?.plan.input.excludeListening).toBe(excludeListening);
  });
  it.each(['true', 1, null, [], {}])('rejects an invalid skip-listening preference: %j', excludeListening => {
    const active = trip();
    (active.plan.input as unknown as Record<string, unknown>).excludeListening = excludeListening;
    expect(readStoredTrip(active)).toBeNull();
    expect(saveActiveTrip(active, memoryStorage())).toBe(false);
  });
  it('rejects a listening mission when the saved preference excludes listening', () => {
    const active = trip();
    active.plan = structuredClone(createDemoPlan({ ...active.plan.input, excludeListening: true }));
    active.plan.missions[0].category = 'listen';
    expect(readStoredTrip(active)).toBeNull();
    expect(saveActiveTrip(active, memoryStorage())).toBe(false);
  });
  it('also sanitizes callers using the original saveLocal API', () => {
    const storage = memoryStorage();
    expect(saveLocal(ACTIVE_KEY, trip(), storage)).toBe(true);
    expect(JSON.parse(storage.data.get(ACTIVE_KEY)!).plan.input.mood).toBe('');
    expect(saveLocal(ACTIVE_KEY, { bad: true }, storage)).toBe(false);
    expect(JSON.parse(storage.data.get(ACTIVE_KEY)!).id).toBe('trip-1');
  });
  it('migrates legacy free text and unexpected properties out of browser storage', () => {
    const active = trip();
    const legacy = { ...active, extraPrivateText: 'a secret', plan: { ...active.plan, extra: 'a secret',
      input: { ...active.plan.input, extra: 'a secret' } } };
    const storage = memoryStorage(JSON.stringify(legacy));
    const loaded = readActive(storage);
    expect(loaded?.plan.input.mood).toBe('');
    expect(loaded?.plan.query).toBe('');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.data.get(ACTIVE_KEY)).not.toContain('a secret');
    expect(storage.data.get(ACTIVE_KEY)).not.toContain('My private original thoughts');
    readActive(storage);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
  it('returns a safe trip even if migration cannot be written', () => {
    const original = JSON.stringify(trip());
    const loaded = readActive({ getItem: () => original, setItem: () => { throw Error('quota'); } });
    expect(loaded?.plan.query).toBe('');
    expect(loaded?.plan.input.mood).toBe('');
    expect(loaded?.id).toBe('trip-1');
    expect(saveActiveTrip(trip(), { setItem: () => { throw Error('quota'); } })).toBe(false);
  });
  it.each([
    ['missing ID', (a: ActiveTrip) => { a.id = ''; }],
    ['negative start', (a: ActiveTrip) => { a.startedAt = -1; }],
    ['out-of-range date', (a: ActiveTrip) => { a.startedAt = 8_640_000_000_000_001; }],
    ['nonfinite end', (a: ActiveTrip) => { a.endsAt = Infinity; }],
    ['end before start', (a: ActiveTrip) => { a.endsAt = a.startedAt - 1; }],
    ['inconsistent duration', (a: ActiveTrip) => { a.endsAt += 1; }],
    ['too few missions', (a: ActiveTrip) => { a.plan.missions.pop(); }],
    ['duplicate missions', (a: ActiveTrip) => { a.plan.missions[1] = a.plan.missions[0]; }],
    ['missing title', (a: ActiveTrip) => { a.plan.missions[0].title = ''; }],
    ['invalid settings', (a: ActiveTrip) => { a.plan.missions[0].settings = []; }],
    ['wrong setting', (a: ActiveTrip) => { a.plan.missions[0].settings = ['doorstep']; }],
    ['incompatible movement', (a: ActiveTrip) => { a.plan.input.pace = 'stay'; a.plan.missions[0].stationary = false; }],
    ['oversized input', (a: ActiveTrip) => { a.plan.input.mood = 'x'.repeat(501); }],
    ['oversized query', (a: ActiveTrip) => { a.plan.query = 'x'.repeat(1001); }],
    ['bad timestamp', (a: ActiveTrip) => { a.plan.createdAt = 'not a date'; }],
    ['nonfinite score', (a: ActiveTrip) => { a.plan.similarities.x = NaN; }],
  ])('rejects %s and preserves the stored original', (_, mutate) => {
    const active = trip(); mutate(active);
    const storage = memoryStorage(JSON.stringify(active));
    expect(readActive(storage)).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(saveActiveTrip(active, storage)).toBe(false);
  });
  it.each(['id', 'title', 'kicker', 'description', 'instruction', 'reflection', 'intent', 'tags', 'settings', 'stationary', 'category'])
    ('validates mission field %s instead of trusting JSON shape', field => {
      const active = trip();
      (active.plan.missions[0] as unknown as Record<string, unknown>)[field] = { unexpected: true };
      expect(readStoredTrip(active)).toBeNull();
    });
  it('does not accept an array coerced into a valid category string', () => {
    const active = trip();
    (active.plan.missions[0] as unknown as Record<string, unknown>).category = ['listen'];
    expect(readStoredTrip(active)).toBeNull();
  });
  it.each(['input', 'model', 'query', 'similarities', 'missions', 'createdAt', 'mode'])
    ('validates plan field %s', field => {
      const active = trip();
      (active.plan as unknown as Record<string, unknown>)[field] = 123;
      expect(readStoredTrip(active)).toBeNull();
    });
});

describe('journal backup validation', () => {
  it('round-trips the existing export format, including empty and Unicode notes', () => {
    expect(parseJournalBackup(backup())).toEqual([entry()]);
    expect(parseJournalBackup(backup([]))).toEqual([]);
    expect(parseJournalBackup(backup([entry({ note: '🍃 花, sky\nA quieter moment.' })]))[0].note).toBe('🍃 花, sky\nA quieter moment.');
    expect(parseJournalBackup(backup([entry({ note: 'x'.repeat(MAX_NOTE_LENGTH), minutes: 0, endedAt: 0 })]))).toHaveLength(1);
  });
  it.each(['', '  ', '{bad', 'null', '[]', '[{}]', JSON.stringify({ entries: [entry()] })])('rejects unsupported JSON: %j', text => {
    expect(() => parseJournalBackup(text)).toThrow();
  });
  it.each([
    { app: 'Another app' }, { version: 2 }, { version: '1' }, { exportedAt: 'yesterday' },
    { exportedAt: '2026-02-30T00:00:00.000Z' }, { entries: {} }, { unknown: 'data would be lost' },
  ])('rejects malformed or unsupported envelope: %j', overrides => {
    expect(() => parseJournalBackup(backup([entry()], overrides))).toThrow(/supported Outward/);
  });
  it.each([
    { id: '' }, { id: 123 }, { id: 'x'.repeat(129) }, { title: '' }, { title: null },
    { endedAt: -1 }, { endedAt: '2026-10-06' }, { endedAt: 8_640_000_000_000_001 },
    { minutes: -1 }, { minutes: Infinity }, { minutes: '20' }, { minutes: 1e308 },
    { note: null }, { note: 'x'.repeat(2001) }, { feeling: {} },
    { missionTitles: [] }, { missionTitles: [null] }, { missionTitles: ['a', 'b', 'c', 'd'] },
    { mode: 'maybe' }, { unknown: 'data would be lost' },
  ])('rejects an invalid note without importing the valid part: %j', overrides => {
    expect(() => parseJournalBackup(backup([entry({ id: 'valid' }), { ...entry(), ...overrides }]))).toThrow(/Note 2/);
  });
  it('rejects a missing required field', () => {
    const data: Record<string, unknown> = { ...entry() }; delete data.note;
    expect(() => parseJournalBackup(backup([data]))).toThrow(/invalid fields/);
  });
  it('rejects oversized files by UTF-8 bytes as well as character count', () => {
    expect(() => parseJournalBackup(' '.repeat(MAX_JOURNAL_BACKUP_BYTES + 1))).toThrow(/too large/);
    expect(() => parseJournalBackup('🍃'.repeat(600000))).toThrow(/too large/);
  });
  it('refuses more than 100 incoming notes rather than truncating', () => {
    const entries = Array.from({ length: 101 }, (_, i) => entry({ id: String(i) }));
    expect(() => parseJournalBackup(backup(entries))).toThrow(/more than 100/);
    expect(parseJournalBackup(backup(entries.slice(0, 100)))).toHaveLength(100);
  });
  it('rejects conflicting copies of an ID within the backup', () => {
    expect(() => parseJournalBackup(backup([entry(), entry({ note: 'different' })]))).toThrow(/different version/);
  });
  it('rejects unexpected prototype-like fields rather than carrying them into state', () => {
    const text = backup().replace('"id":"note-1"', '"__proto__":{"polluted":true},"id":"note-1"');
    expect(() => parseJournalBackup(text)).toThrow(/invalid fields/);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('lossless journal merging', () => {
  it('deduplicates identical IDs and sorts newest first', () => {
    const old = entry({ id: 'old', endedAt: now - 60000 });
    const latest = entry({ id: 'latest', endedAt: now + 60000 });
    expect(mergeJournalEntries([old, entry()], [entry(), latest])).toEqual([latest, entry(), old]);
  });
  it('rejects a conflicting duplicate rather than replacing an original', () => {
    const original = [entry()];
    const incoming = [entry({ note: 'replacement' })];
    expect(() => mergeJournalEntries(original, incoming)).toThrow(/original notes were kept/);
    expect(original).toEqual([entry()]);
    expect(incoming[0].note).toBe('replacement');
  });
  it('never mutates input arrays or nested entries', () => {
    const original = [entry()];
    const incoming = [entry({ id: 'new' })];
    const merged = mergeJournalEntries(original, incoming);
    merged[0].missionTitles.push('changed');
    merged[0].note = 'changed';
    expect(original).toEqual([entry()]);
    expect(incoming).toEqual([entry({ id: 'new' })]);
  });
  it('allows an identical duplicate at capacity but refuses an additional note', () => {
    const current = Array.from({ length: 100 }, (_, i) => entry({ id: String(i) }));
    expect(mergeJournalEntries(current, [current[0]])).toHaveLength(100);
    expect(() => mergeJournalEntries(current, [entry()])).toThrow(/exceed the 100-note limit/);
    expect(current).toHaveLength(100);
  });
  it('validates the caller data even when it did not come through the backup parser', () => {
    expect(() => mergeJournalEntries([entry({ minutes: NaN })], [])).toThrow(/invalid data/);
    expect(() => mergeJournalEntries([], [entry({ note: 'x'.repeat(2001) })])).toThrow(/invalid data/);
  });
  it('treats prototype-like IDs as ordinary IDs', () => {
    const unusual = entry({ id: '__proto__' });
    expect(mergeJournalEntries([unusual], [unusual])).toEqual([unusual]);
  });
});

describe('absolute trip time', () => {
  it('catches up across screen lock and clamps backwards clock changes', () => {
    expect(remainingSeconds(600000, 300000)).toBe(300);
    expect(remainingSeconds(600000, 900000)).toBe(0);
    expect(formatTime(61)).toBe('01:01');
    expect(formatTime(60.9)).toBe('01:00');
    expect(elapsedMinutes(0, 90000)).toBe(2);
    expect(elapsedMinutes(90000, 0)).toBe(0);
  });
  it('keeps corrupt time values out of the UI', () => {
    expect(remainingSeconds(Infinity, now)).toBe(0);
    expect(remainingSeconds(now, NaN)).toBe(0);
    expect(elapsedMinutes(NaN, now)).toBe(0);
    expect(formatTime(NaN)).toBe('00:00');
    expect(formatTime(Infinity)).toBe('00:00');
    expect(formatTime(-1)).toBe('00:00');
  });
});
