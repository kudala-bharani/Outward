import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Footprints,
  Leaf,
  LoaderCircle,
  MapPin,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sprout,
  Sun,
  Trees,
  Wind,
  X,
} from "lucide-react";
import { createPlan } from "./ai/client";
import type { ModelProgress, Plan, PlanInput, Setting } from "./types";
import {
  ACTIVE_KEY,
  JOURNAL_KEY,
  elapsedMinutes,
  formatTime,
  readActive,
  readJournal,
  remainingSeconds,
  saveLocal,
  saveActiveTrip,
  parseJournalBackup,
  mergeJournalEntries,
  MAX_JOURNAL_BACKUP_BYTES,
} from "./storage";
import type { ActiveTrip, JournalEntry } from "./storage";

const settings: { id: Setting; label: string; icon: typeof Trees }[] = [
  { id: "neighborhood", label: "Neighborhood", icon: MapPin },
  { id: "park", label: "Park or green space", icon: Trees },
  { id: "doorstep", label: "Doorstep or balcony", icon: Sun },
];
const starterMoods = [
  "A quieter mind",
  "A little curiosity",
  "Something different",
];
const moods: Record<string, string> = {
  "A quieter mind":
    "I have been staring at a screen all day. I want some quiet, soft sounds, and a slower pace.",
  "A little curiosity":
    "I want to be curious and notice tiny details, surprising patterns, and things I usually miss.",
  "Something different":
    "I feel stuck in a routine and want fresh colors, a different perspective, and a sense of discovery.",
};
function Mark({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-mark ${large ? "large" : ""}`} aria-hidden="true">
      <Sprout />
    </span>
  );
}
function NatureIcon({ category, index }: { category?: string; index: number }) {
  const Icon =
    category === "listen"
      ? Radio
      : category === "sky" || category === "light"
        ? Sun
        : [Wind, Leaf, Sun][index % 3];
  return <Icon aria-hidden="true" />;
}

export default function App() {
  const [view, setView] = useState<"plan" | "journal">("plan");
  const [input, setInput] = useState<PlanInput>({
    mood: "",
    duration: 20,
    setting: "neighborhood",
    pace: "wander",
  });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ModelProgress | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [active, setActive] = useState<ActiveTrip | null>(readActive);
  const [reflect, setReflect] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>(readJournal);
  const [note, setNote] = useState("");
  const [feeling, setFeeling] = useState("More present");
  const [showPrompts, setShowPrompts] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [modal, setModal] = useState<
    "about" | "proof" | "import" | "delete" | null
  >(null);
  const [importedNotes, setImportedNotes] = useState<JournalEntry[]>([]);
  const [journalError, setJournalError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<JournalEntry | null>(null);
  const [undoEntries, setUndoEntries] = useState<JournalEntry[]>([]);
  const undoEntry = undoEntries.at(-1);
  const importFile = useRef<HTMLInputElement>(null);
  const importRequest = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const planHeading = useRef<HTMLHeadingElement>(null);
  const resultRequest = useRef(0);
  const stage = active ? (reflect ? "reflect" : "pocket") : view;
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) {
      document.querySelector<HTMLElement>("main h1")?.focus();
      previousStage.current = stage;
    }
  }, [stage]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  async function findPlan(mode: "ai" | "demo", anotherSet = false) {
    if (busy) return;
    setError("");
    setStatus("");
    setBusy(true);
    setProgress(null);
    const request = ++resultRequest.current;
    controller.current = new AbortController();
    try {
      const result = await createPlan(
        {
          ...input,
          mood: input.mood.trim(),
        },
        {
          mode,
          onProgress: setProgress,
          signal: controller.current.signal,
          excludeMissionIds: anotherSet
            ? plan?.missions.map((m) => m.id)
            : undefined,
        },
      );
      if (request !== resultRequest.current) return;
      setPlan(result);
      setTimeout(() => planHeading.current?.focus(), 0);
    } catch (e) {
      if (request !== resultRequest.current) return;
      setError(
        e instanceof Error
          ? e.message
          : "The model could not start. Try again or choose the sample.",
      );
    } finally {
      if (request === resultRequest.current) {
        setBusy(false);
        setProgress(null);
      }
    }
  }
  function cancelLoading() {
    resultRequest.current++;
    controller.current?.abort();
    setBusy(false);
    setProgress(null);
    setStatus("Download cancelled. You can try again or explore a sample.");
  }
  function startTrip() {
    if (!plan || active || planStale || busy) return;
    const startedAt = Date.now();
    const trip = {
      id: crypto.randomUUID(),
      plan,
      startedAt,
      endsAt: startedAt + plan.input.duration * 60000,
    };
    if (!saveActiveTrip(trip))
      setStatus(
        "Browser storage is unavailable. Keep this tab open to keep your trip.",
      );
    setActive(trip);
    setNow(startedAt);
    setReflect(false);
    setShowPrompts(false);
    window.scrollTo(0, 0);
  }
  function finishTrip() {
    if (!active) return;
    const entry: JournalEntry = {
      id: active.id,
      title: active.plan.missions[0]?.title || "A little time outside",
      endedAt: Date.now(),
      minutes: elapsedMinutes(active.startedAt),
      feeling,
      note: note.trim(),
      missionTitles: active.plan.missions.map((m) => m.title),
      mode: active.plan.mode,
    };
    const next = [entry, ...journal.filter((e) => e.id !== entry.id)];
    if (next.length > 100) {
      setError(
        "You have 100 saved notes. Review and remove an older note before saving another, or copy this reflection and finish without saving.",
      );
      return;
    }
    if (!saveLocal(JOURNAL_KEY, next)) {
      setError(
        "Your browser could not save this note. Copy it somewhere safe, or try again.",
      );
      return;
    }
    setJournal(next);
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {}
    setActive(null);
    setReflect(false);
    setNote("");
    setError("");
    setStatus("A little piece of outside, saved.");
    setView("journal");
    window.scrollTo(0, 0);
  }
  function cancelTrip() {
    try {
      localStorage.removeItem(ACTIVE_KEY);
    } catch {}
    setActive(null);
    setReflect(false);
    setNote("");
    setError("");
    setStatus(
      "Trip ended without saving. You can head out again whenever you like.",
    );
  }
  function exportJournal() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "Outward",
            version: 1,
            exportedAt: new Date().toISOString(),
            entries: journal,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "outward-field-notes.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  async function readBackup(file: File | undefined) {
    if (!file) return;
    const request = ++importRequest.current;
    setJournalError("");
    try {
      if (file.size > MAX_JOURNAL_BACKUP_BYTES)
        throw new Error("Choose an Outward backup smaller than 2 MB.");
      const entries = parseJournalBackup(await file.text());
      mergeJournalEntries(journal, entries);
      if (request !== importRequest.current) return;
      setImportedNotes(entries);
      setModal("import");
    } catch (reason) {
      if (request === importRequest.current)
        setJournalError(
          reason instanceof Error
            ? reason.message
            : "This backup could not be read.",
        );
    }
  }
  function confirmImport() {
    try {
      const merged = mergeJournalEntries(journal, importedNotes);
      const added = merged.length - journal.length;
      if (!saveLocal(JOURNAL_KEY, merged))
        throw new Error(
          "Your browser could not save these notes. Existing notes are unchanged.",
        );
      setJournal(merged);
      setModal(null);
      setImportedNotes([]);
      setStatus(
        added
          ? `${added} ${added === 1 ? "note restored" : "notes restored"}. Existing notes kept.`
          : "Those notes are already in your journal. Nothing was replaced.",
      );
    } catch (reason) {
      setJournalError(
        reason instanceof Error
          ? reason.message
          : "The backup could not be restored.",
      );
      setModal(null);
    }
  }
  function deleteNote() {
    if (!pendingDelete) return;
    const next = journal.filter((entry) => entry.id !== pendingDelete.id);
    if (!saveLocal(JOURNAL_KEY, next)) {
      setJournalError(
        "Your browser could not remove this note. It is still in your journal.",
      );
      setModal(null);
      return;
    }
    setUndoEntries((previous) => [
      ...previous.filter((entry) => entry.id !== pendingDelete.id),
      pendingDelete,
    ]);
    setJournal(next);
    setPendingDelete(null);
    setModal(null);
    setStatus("Note removed. You can undo until you leave this page.");
  }
  function undoDelete() {
    if (!undoEntry) return;
    try {
      const next = mergeJournalEntries(journal, [undoEntry]);
      if (!saveLocal(JOURNAL_KEY, next))
        throw new Error("Your browser could not restore this note. Try again.");
      setJournal(next);
      setUndoEntries((previous) =>
        previous.filter((entry) => entry.id !== undoEntry.id),
      );
      setStatus("Note restored.");
    } catch (reason) {
      setJournalError(
        reason instanceof Error
          ? reason.message
          : "The note could not be restored.",
      );
    }
  }
  const planStale =
    !!plan &&
    (plan.input.mood.trim() !== input.mood.trim() ||
      plan.input.setting !== input.setting ||
      plan.input.duration !== input.duration ||
      plan.input.pace !== input.pace ||
      !!plan.input.excludeListening !== !!input.excludeListening);
  const remaining = active ? remainingSeconds(active.endsAt, now) : 0;
  return (
    <div className={active && !reflect ? "app pocket-app" : "app"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <button
          className="brand"
          aria-label="Outward home"
          onClick={() => setView("plan")}
        >
          <Mark />
          <span>
            outward<span className="brand-dot">.</span>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button
            aria-pressed={view === "plan"}
            className={view === "plan" ? "nav-link selected" : "nav-link"}
            onClick={() => setView("plan")}
          >
            <Sun size={16} />
            Step outside
          </button>
          <button
            aria-pressed={view === "journal"}
            className={view === "journal" ? "nav-link selected" : "nav-link"}
            onClick={() => setView("journal")}
          >
            <BookOpen size={16} />
            Field notes
            {journal.length > 0 && (
              <span className="nav-count">{journal.length}</span>
            )}
          </button>
        </nav>
        <button className="model-pill" onClick={() => setModal("about")}>
          <span className="status-dot" />
          Open AI, on your device
          <CircleHelp size={14} />
        </button>
      </header>
      <main id="main">
        {undoEntry && !status && (
          <div className="status-banner" role="status">
            A deleted note can still be restored.
            <button className="undo-button" onClick={undoDelete}>
              Undo
            </button>
          </div>
        )}
        {status && (
          <div className="status-banner" role="status">
            <Check size={16} />
            {status}
            {undoEntry && (
              <button className="undo-button" onClick={undoDelete}>
                Undo
              </button>
            )}
            <button aria-label="Dismiss message" onClick={() => setStatus("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {active ? (
          reflect ? (
            <section className="reflection-page">
              <button className="text-button" onClick={() => setReflect(false)}>
                <ArrowLeft size={16} />
                Back to my trip
              </button>
              <span className="eyebrow">THE PART YOU BRING HOME</span>
              <h1 tabIndex={-1}>Welcome back.</h1>
              <p className="intro">
                You made a little room for the world. What stayed with you?
              </p>
              <form
                className="reflection-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  finishTrip();
                }}
              >
                <fieldset>
                  <legend>How are you feeling?</legend>
                  <div className="feeling-options">
                    {[
                      "More present",
                      "A little brighter",
                      "About the same",
                      "Something else",
                    ].map((f) => (
                      <button
                        key={f}
                        type="button"
                        className={feeling === f ? "chip active" : "chip"}
                        aria-pressed={feeling === f}
                        onClick={() => setFeeling(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label htmlFor="reflection">
                  One thing you noticed{" "}
                  <span className="muted">(optional)</span>
                </label>
                <textarea
                  id="reflection"
                  value={note}
                  maxLength={2000}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={active.plan.missions[0].reflection}
                  rows={5}
                />
                <p className="privacy-hint">
                  <ShieldCheck size={14} />
                  Only saved in this browser. No AI reads your field notes.
                </p>
                {error && (
                  <p role="alert" className="error-message">
                    {error}
                  </p>
                )}
                {error && journal.length >= 100 && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setPendingDelete(journal[journal.length - 1]);
                      setModal("delete");
                    }}
                  >
                    Review oldest note to make room
                  </button>
                )}
                <button className="primary-button" type="submit">
                  Save my field note
                </button>
                <button
                  className="text-button centered"
                  type="button"
                  onClick={cancelTrip}
                >
                  Finish without saving
                </button>
              </form>
            </section>
          ) : (
            <section className="pocket-page">
              <div className="pocket-overline">
                <span className="status-dot" /> POCKET MODE
              </div>
              <div className="pocket-symbol">
                <Sprout size={58} strokeWidth={1.3} />
              </div>
              <h1 tabIndex={-1}>
                The good part is
                <br />
                <em>out there.</em>
              </h1>
              <p>
                Lock your screen. Take your time.
                <br />
                Come back with one small discovery.
              </p>
              <ol className="pocket-memory" aria-label="Your three invitations">
                {active.plan.missions.map((m) => (
                  <li key={m.id}>{m.title}</li>
                ))}
              </ol>
              <div
                className="timer"
                role="timer"
                aria-label={`${formatTime(remaining)} remaining`}
              >
                {remaining ? formatTime(remaining) : "Take your time"}
              </div>
              <span className="timer-caption">
                {remaining
                  ? "A gentle time guide. No alarm or notifications."
                  : "Your planned time is up. Come back when it suits you."}
              </span>
              <button
                className="pocket-prompts-toggle"
                onClick={() => setShowPrompts(!showPrompts)}
                aria-expanded={showPrompts}
              >
                {showPrompts ? "Hide" : "Remember"} my three invitations
                <ChevronDown size={15} />
              </button>
              {showPrompts && (
                <div className="pocket-prompts">
                  {active.plan.missions.map((m, i) => (
                    <div key={m.id}>
                      <span>0{i + 1}</span>
                      <h3>{m.title}</h3>
                      <p>{m.instruction}</p>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="primary-button light-button"
                onClick={() => {
                  setReflect(true);
                  setError("");
                }}
              >
                I'm back
              </button>
              <button className="pocket-exit" onClick={cancelTrip}>
                End without a note
              </button>
              <p className="pocket-safety">
                Stay somewhere familiar and safe. Stop whenever you need to.
              </p>
            </section>
          )
        ) : view === "journal" ? (
          <section className="journal-page">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A COLLECTION OF LITTLE THINGS</span>
                <h1 tabIndex={-1}>
                  Your field notes<span className="sage-period">.</span>
                </h1>
                <p className="intro">
                  Outside doesn’t have to be extraordinary to be worth noticing.
                </p>
              </div>
              <div className="journal-tools">
                <input
                  ref={importFile}
                  className="sr-only"
                  tabIndex={-1}
                  type="file"
                  accept=".json,application/json"
                  aria-label="Choose an Outward backup"
                  onChange={(e) => {
                    void readBackup(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  className="secondary-button"
                  onClick={() => importFile.current?.click()}
                >
                  <Upload size={16} />
                  Restore backup
                </button>
                {journal.length > 0 && (
                  <button className="secondary-button" onClick={exportJournal}>
                    <Download size={16} />
                    Export notes
                  </button>
                )}
              </div>
            </div>
            {journalError && (
              <p className="error-message" role="alert">
                {journalError}
              </p>
            )}
            {journal.length === 0 ? (
              <div className="empty-journal">
                <BookOpen size={40} strokeWidth={1.2} />
                <h2>Nothing here. Plenty out there.</h2>
                <p>
                  Your first trip doesn’t need to be a big one.
                  <br />A doorstep, a familiar street, a patch of sky.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setView("plan")}
                >
                  Find a small escape
                </button>
              </div>
            ) : (
              <>
                <div className="journal-summary">
                  <Sprout size={19} />
                  <strong>{journal.length}</strong> little{" "}
                  {journal.length === 1 ? "trip" : "trips"} outside
                  <span className="summary-divider" />
                  <strong>
                    {journal.reduce((s, e) => s + e.minutes, 0)}
                  </strong>{" "}
                  minutes you recorded
                </div>
                <div className="journal-grid">
                  {journal.map((entry, index) => (
                    <article className="journal-card" key={entry.id}>
                      <div className="note-topline">
                        <span>
                          FIELD NOTE{" "}
                          {String(journal.length - index).padStart(2, "0")}
                        </span>
                        <button
                          className="delete-note"
                          aria-label={`Delete note: ${entry.title}`}
                          onClick={() => {
                            setPendingDelete(entry);
                            setModal("delete");
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      <h2>{entry.title}</h2>
                      <p className="entry-note">
                        {entry.note || "Some things are enough just to notice."}
                      </p>
                      <div className="journal-meta">
                        <span>{entry.feeling}</span>
                        <span>
                          {new Date(entry.endedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      </div>
                      <small>
                        {entry.minutes < 1
                          ? "Less than a minute"
                          : `${entry.minutes} min`}{" "}
                        ·{" "}
                        {entry.mode === "ai"
                          ? "Locally AI-matched"
                          : "Sample trip"}
                      </small>
                    </article>
                  ))}
                </div>
                <p className="privacy-hint journal-privacy">
                  <ShieldCheck size={14} />
                  Stored only in this browser, unencrypted. Export to keep a
                  copy; clearing browser data removes your notes.
                </p>
              </>
            )}
          </section>
        ) : (
          <section className="planner-page">
            <div className="intro-row">
              <div>
                <span className="eyebrow">
                  <span /> LESS SCROLLING. MORE SKY.
                </span>
                <h1 tabIndex={-1}>
                  A small way <em>back outside.</em>
                </h1>
                <p className="intro">
                  A few minutes. Three things to notice. A world beyond your
                  screen.
                </p>
              </div>
              <div className="edition-stamp">
                <span>FIELD GUIDE</span>
                <Sprout size={22} />
                <span>VOL. 001</span>
              </div>
            </div>
            <div className="planner-grid">
              <section className="planner-form" aria-labelledby="planner-title">
                <div className="card-heading">
                  <span className="step-number">01</span>
                  <h2 id="planner-title">Make a little space</h2>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void findPlan("ai");
                  }}
                >
                  <fieldset disabled={busy}>
                    <label htmlFor="mood">What could you use right now?</label>
                    <div className="mood-input">
                      <textarea
                        id="mood"
                        value={input.mood}
                        maxLength={500}
                        onChange={(e) =>
                          setInput({ ...input, mood: e.target.value })
                        }
                        placeholder="My head is full. I'd like to slow down and notice something small…"
                        rows={3}
                      />
                      <span>{input.mood.length}/500</span>
                    </div>
                    <div className="mood-chips">
                      {starterMoods.map((m) => (
                        <button
                          className={
                            input.mood === moods[m] ? "chip active" : "chip"
                          }
                          key={m}
                          type="button"
                          aria-pressed={input.mood === moods[m]}
                          onClick={() => setInput({ ...input, mood: moods[m] })}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="control-heading">
                      <Clock3 size={15} />
                      <label>How much time?</label>
                    </div>
                    <div
                      className="duration-control"
                      role="group"
                      aria-label="Trip duration"
                    >
                      {([10, 20, 30] as const).map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          aria-label={`${duration} min`}
                          aria-pressed={duration === input.duration}
                          className={
                            duration === input.duration
                              ? "duration active"
                              : "duration"
                          }
                          onClick={() => setInput({ ...input, duration })}
                        >
                          {duration}
                          <span> min</span>
                        </button>
                      ))}
                    </div>
                    <label htmlFor="setting" className="space-label">
                      Where can you go?
                    </label>
                    <div className="select-wrap">
                      <MapPin size={17} />
                      <select
                        id="setting"
                        value={input.setting}
                        onChange={(e) =>
                          setInput({
                            ...input,
                            setting: e.target.value as Setting,
                          })
                        }
                      >
                        {settings.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} />
                    </div>
                    <div
                      className="pace-toggle"
                      role="group"
                      aria-label="Movement preference"
                    >
                      <button
                        type="button"
                        className={input.pace === "wander" ? "active" : ""}
                        aria-pressed={input.pace === "wander"}
                        onClick={() => setInput({ ...input, pace: "wander" })}
                      >
                        <Footprints size={16} />A gentle wander
                      </button>
                      <button
                        type="button"
                        className={input.pace === "stay" ? "active" : ""}
                        aria-pressed={input.pace === "stay"}
                        onClick={() => setInput({ ...input, pace: "stay" })}
                      >
                        <Leaf size={16} />
                        Stay in one spot
                      </button>
                    </div>
                    <label className="listening-choice">
                      <input
                        type="checkbox"
                        checked={!!input.excludeListening}
                        onChange={(e) =>
                          setInput({
                            ...input,
                            excludeListening: e.target.checked,
                          })
                        }
                      />
                      <span>Skip listening activities</span>
                    </label>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? (
                        <>
                          <LoaderCircle className="spin" size={18} />
                          {progress?.stage === "loading"
                            ? "Loading the open model…"
                            : "Finding your field trip…"}
                        </>
                      ) : (
                        <>Find my field trip</>
                      )}
                    </button>
                  </fieldset>
                </form>
                {busy ? (
                  <div className="loading-state" role="status">
                    <p>
                      {progress?.message ||
                        "Preparing local AI. The first visit downloads the model."}
                    </p>
                    {typeof progress?.progress === "number" && (
                      <progress
                        max="100"
                        value={progress.progress}
                        aria-label="Model download progress"
                      />
                    )}
                    <p className="loading-reassurance">
                      You can cancel safely. If the download stalls, we’ll offer
                      a fresh retry.
                    </p>
                    <button className="text-button" onClick={cancelLoading}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="demo-button"
                      onClick={() => void findPlan("demo")}
                    >
                      Explore a sample instead
                    </button>
                    <p className="download-note">
                      First AI use downloads an open model (~23 MB + runtime).
                      <br />
                      Your words stay on your device.{" "}
                      <button onClick={() => setModal("about")}>
                        How it works
                      </button>
                    </p>
                  </>
                )}
                {error && (
                  <div className="error-message" role="alert">
                    <strong>Your field trip couldn’t update.</strong>
                    <p>{error}</p>
                    <span>
                      Retry when connected, or choose the sample above. Samples
                      don’t use AI.
                    </span>
                  </div>
                )}
              </section>
              <section
                className={`field-card ${plan ? "has-plan" : ""}`}
                aria-label="Your field trip"
              >
                <div className="landscape">
                  <img
                    src="/landscape.svg"
                    alt="An illustrated winding path through quiet green hills"
                  />
                  <div className="landscape-label">
                    <span className="dot-light" />
                    {plan
                      ? "A LITTLE TIME, WELL SPENT"
                      : "THERE’S A WHOLE WORLD OUT THERE"}
                  </div>
                  <span className="landscape-coordinate">
                    NO DESTINATION REQUIRED ↗
                  </span>
                </div>
                <div className="field-card-content">
                  <div className="plan-meta">
                    <span>
                      {plan
                        ? plan.mode === "ai"
                          ? "MATCHED ON YOUR DEVICE"
                          : "SAMPLE · NO AI USED"
                        : "YOUR NEXT SMALL ESCAPE"}
                    </span>
                    <span>
                      <Clock3 size={13} />
                      {plan?.input.duration || input.duration} min
                    </span>
                  </div>
                  <h2 ref={planHeading} tabIndex={-1}>
                    {plan ? (
                      "Your pocket-sized field trip."
                    ) : (
                      <>
                        A change of scenery.
                        <br />A change of pace.
                      </>
                    )}
                  </h2>
                  {plan ? (
                    <>
                      {planStale && (
                        <p className="stale-plan" role="status">
                          Your choices changed. Find a new field trip before
                          heading out.
                        </p>
                      )}
                      <p className="plan-intro">
                        {plan.input.pace === "stay"
                          ? "Settle somewhere safe. No walking needed."
                          : "Choose a familiar, safe place to wander."}{" "}
                        Take these three invitations with you.
                      </p>
                      <ol className="mission-list">
                        {plan.missions.map((m, i) => (
                          <li key={m.id}>
                            <span className="mission-icon">
                              <NatureIcon category={m.category} index={i} />
                            </span>
                            <div>
                              <span className="mission-kicker">
                                0{i + 1} · {m.kicker}
                              </span>
                              <h3>{m.title}</h3>
                              <p>{m.instruction}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                      <div className="trip-actions">
                        <button
                          className="primary-button"
                          onClick={startTrip}
                          disabled={busy || planStale}
                        >
                          Take this outside
                        </button>
                        <button
                          className="secondary-button another-set"
                          disabled={busy || planStale}
                          onClick={() => void findPlan(plan.mode, true)}
                        >
                          <RefreshCw size={16} />
                          Try another set
                        </button>
                        <button
                          className="match-explanation"
                          onClick={() => setModal("proof")}
                        >
                          <Sparkles size={14} />
                          {plan.mode === "ai"
                            ? "Why these three?"
                            : "About this sample"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="preview-description">
                        An open model turns what you need into three simple
                        things to notice. Then your phone gets out of the way.
                      </p>
                      <div className="preview-invitations">
                        <span>
                          <Radio />
                          Listen a little closer
                        </span>
                        <span>
                          <Leaf />
                          Notice the overlooked
                        </span>
                        <span>
                          <Sun />
                          Follow your curiosity
                        </span>
                      </div>
                      <div className="promise">
                        <Smartphone size={18} />
                        <span>The screen is the shortest part.</span>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
            <div className="bottom-notes">
              <p>
                <ShieldCheck size={15} />
                No account. No location tracking. No feeds.
              </p>
              <p>
                <Sprout size={16} />
                Small steps count. Doorsteps, too.
              </p>
            </div>
            <aside className="safety-note">
              Choose a place you know is safe. Check conditions yourself, keep
              away from traffic and water edges, and leave plants and wildlife
              undisturbed.
            </aside>
          </section>
        )}
      </main>
      {!active && (
        <footer>
          <span>
            outward<span className="brand-dot">.</span>
            <span className="footer-tagline"> Made for the world outside.</span>
          </span>
          <button onClick={() => setModal("about")}>Open by nature</button>
        </footer>
      )}
      <dialog
        aria-labelledby="details-title"
        ref={dialog}
        className="info-dialog"
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
      >
        <button
          className="dialog-close"
          aria-label="Close details"
          onClick={() => setModal(null)}
        >
          <X size={20} />
        </button>
        {modal === "import" ? (
          <>
            <span className="eyebrow">LOCAL BACKUP</span>
            <h2 id="details-title">Bring your notes back.</h2>
            <p>
              This backup contains {importedNotes.length}{" "}
              {importedNotes.length === 1 ? "note" : "notes"}. We’ll merge it
              with the {journal.length} already here, skip identical copies, and
              keep existing notes unchanged.
            </p>
            <p className="small-text">
              The file is read on your device. Nothing is uploaded. Conflicting
              copies and backups that exceed the 100-note limit are rejected
              before saving.
            </p>
            <button className="primary-button" onClick={confirmImport}>
              Restore notes
            </button>
            <button
              className="text-button centered"
              onClick={() => setModal(null)}
            >
              Keep things as they are
            </button>
          </>
        ) : modal === "delete" ? (
          <>
            <span className="eyebrow">YOUR FIELD NOTES</span>
            <h2 id="details-title">Remove this note?</h2>
            <p>{pendingDelete?.title}</p>
            <p>
              You can undo this while the page stays open. After you leave, an
              exported backup is the only way to bring it back.
            </p>
            <button className="secondary-button" onClick={exportJournal}>
              <Download size={16} />
              Export a backup first
            </button>
            <button
              className="primary-button danger-button"
              onClick={deleteNote}
            >
              Delete note
            </button>
            <button
              className="text-button centered"
              onClick={() => setModal(null)}
            >
              Keep note
            </button>
          </>
        ) : modal === "about" ? (
          <>
            <Mark large />
            <span className="eyebrow">OPEN BY NATURE</span>
            <h2 id="details-title">
              A small model.
              <br />A little more world.
            </h2>
            <p>
              Outward uses <strong>all-MiniLM-L6-v2</strong>, an Apache-2.0 open
              model, to match the meaning of your words to a library of curated
              outdoor invitations.
            </p>
            <p>
              The model runs in a browser worker on your device, using
              Transformers.js and ONNX Runtime. It ranks invitations; it doesn’t
              invent places, routes, weather, or safety advice.
            </p>
            <div className="info-fact">
              <Download size={18} />
              <p>
                <strong>One download, local matching</strong>
                <br />
                The first AI trip fetches model files from Hugging Face (~23 MB
                for the model, plus runtime). The host receives normal
                connection metadata, but your input isn’t sent to it. Model
                files are cached when your browser allows.
              </p>
            </div>
            <div className="info-fact">
              <ShieldCheck size={18} />
              <p>
                <strong>Your notes stay yours</strong>
                <br />
                No account, analytics, GPS, or application server. Trip progress
                and journal entries live in this browser’s unencrypted storage.
                Your original mood text is not saved with your trip. Notes
                aren’t passed to the model. Clearing browser data removes them.
              </p>
            </div>
            <p className="small-text">
              After the app and model have cached, repeat visits may work
              offline. Browser storage eviction or private browsing can require
              a new download. Keep the trip tab open when heading out. The timer
              catches up when you return; it won’t send an alarm.
            </p>
            <a
              className="text-button"
              href="https://huggingface.co/Xenova/all-MiniLM-L6-v2"
              target="_blank"
              rel="noreferrer"
            >
              Read the open model card
            </a>
          </>
        ) : plan ? (
          <>
            <span className="eyebrow">BEHIND YOUR FIELD TRIP</span>
            <h2 id="details-title">
              {plan.mode === "ai"
                ? "Matched, right here."
                : "A clearly labeled sample."}
            </h2>
            <p>
              {plan.mode === "ai"
                ? "The local model compares the meaning of your words with each eligible invitation. We keep your place and movement preference as hard limits, then choose three relevant invitations with a little variety."
                : "This sample uses a simple deterministic selection, without downloading or running a model. Use “Find my field trip” to try genuine local AI matching."}
            </p>
            {plan.mode === "ai" && (
              <>
                <p className="query-quote">“{plan.query}”</p>
                <div className="match-scores">
                  {plan.missions.map((m) => (
                    <div key={m.id}>
                      <span>{m.title}</span>
                      <strong>
                        {(plan.similarities[m.id] || 0).toFixed(3)}
                      </strong>
                    </div>
                  ))}
                </div>
                <p className="small-text">
                  Scores are cosine similarity, not probabilities, confidence,
                  or a promise that an activity will help. The model is
                  English-focused and can miss nuance.
                </p>
                <span className="model-id">{plan.model}</span>
              </>
            )}
            <p className="small-text">
              Every invitation comes from a reviewed library. If a suggestion
              doesn’t suit you or the conditions, skip it.
            </p>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
