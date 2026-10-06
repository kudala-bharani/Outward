// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
const mockCreatePlan = vi.hoisted(() => vi.fn());
vi.mock("../src/ai/client", async () => {
  const actual = await vi.importActual("../src/ai/rank");
  return {
    createPlan: mockCreatePlan.mockImplementation(async (input, options) =>
      options.mode === "demo"
        ? (
            actual as {
              createDemoPlan: (input: unknown, options?: unknown) => unknown;
            }
          ).createDemoPlan(input, options)
        : Promise.reject(new Error("Model download blocked in this test.")),
    ),
  };
});
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("UI flows (DOM; separate from real browser QA)", () => {
  it("matches explicit sample, persists trip, saves reflection", async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await user.click(screen.getByRole("button", { name: "A quieter mind" }));
    await user.click(screen.getByRole("button", { name: "10 min" }));
    await user.selectOptions(
      screen.getByLabelText("Where can you go?"),
      "doorstep",
    );
    await user.click(screen.getByRole("button", { name: "Stay in one spot" }));
    await user.click(
      screen.getByRole("button", { name: "Explore a sample instead" }),
    );
    expect(await screen.findByText("SAMPLE · NO AI USED")).toBeTruthy();
    expect(document.querySelectorAll(".mission-list li")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Take this outside" }));
    expect(screen.getByText("POCKET MODE")).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("outward.active.v1")!).plan.input,
    ).toMatchObject({
      duration: 10,
      setting: "doorstep",
      pace: "stay",
      mood: "",
    });
    expect(localStorage.getItem("outward.active.v1")).not.toContain(
      "staring at a screen",
    );
    cleanup();
    render(createElement(App));
    expect(screen.getByText("POCKET MODE")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Remember my three invitations" }),
    );
    expect(document.querySelectorAll(".pocket-prompts h3")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "I'm back" }));
    await user.type(
      screen.getByLabelText("One thing you noticed", { exact: false }),
      "The shadows moved across the doorstep.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save my field note" }),
    );
    expect(
      await screen.findByText("The shadows moved across the doorstep."),
    ).toBeTruthy();
    expect(localStorage.getItem("outward.active.v1")).toBeNull();
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!),
    ).toHaveLength(1);
  });
  it("shows honest AI failure and permits sample retry", async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await user.click(
      screen.getByRole("button", { name: "Find my field trip" }),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("MATCHED ON YOUR DEVICE")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Explore a sample instead" }),
    );
    expect(await screen.findByText("SAMPLE · NO AI USED")).toBeTruthy();
  });
  it("opens, closes, and reopens details without losing form state", async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await user.type(
      screen.getByLabelText("What could you use right now?"),
      "a tiny adventure",
    );
    await user.click(screen.getByRole("button", { name: "How it works" }));
    expect(screen.getByRole("dialog").hasAttribute("open")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(false);
    expect(
      (
        screen.getByLabelText(
          "What could you use right now?",
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("a tiny adventure");
    await user.click(screen.getByRole("button", { name: "How it works" }));
    fireEvent(document.querySelector("dialog")!, new Event("cancel"));
    await waitFor(() =>
      expect(document.querySelector("dialog")?.hasAttribute("open")).toBe(
        false,
      ),
    );
  });
  it("ends sample trip without adding a journal entry", async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await user.click(
      screen.getByRole("button", { name: "Explore a sample instead" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Take this outside" }),
    );
    await user.click(
      screen.getByRole("button", { name: "End without a note" }),
    );
    expect(screen.queryByText("POCKET MODE")).toBeNull();
    expect(localStorage.getItem("outward.active.v1")).toBeNull();
    expect(localStorage.getItem("outward.journal.v1")).toBeNull();
  });
  it("empty journal returns to planner", async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await user.click(screen.getByRole("button", { name: "Field notes" }));
    expect(screen.getByText("Nothing here. Plenty out there.")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Find a small escape" }),
    );
    expect(
      screen.getByRole("button", { name: "Find my field trip" }),
    ).toBeTruthy();
  });
});

const fixtureNote = (id = "note-one", note = "A cedar moved in the wind.") => ({
  id,
  title: "Watch the invisible",
  endedAt: Date.parse("2026-10-05T18:00:00.000Z"),
  minutes: 10,
  feeling: "More present",
  note,
  missionTitles: ["Watch the invisible", "Cloud passage", "A tiny world"],
  mode: "demo" as const,
});
function backupFile(entries: unknown[]) {
  const content = JSON.stringify({
    app: "Outward",
    version: 1,
    exportedAt: "2026-10-06T02:00:00.000Z",
    entries,
  });
  const file = new File([content], "outward-backup.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", { value: async () => content });
  return file;
}
describe("upgrade safeguards", () => {
  it("requires rematching after changing a plan constraint", async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await user.click(
      screen.getByRole("button", { name: "Explore a sample instead" }),
    );
    await user.click(screen.getByRole("button", { name: "10 min" }));
    expect(
      screen.getByText(
        "Your choices changed. Find a new field trip before heading out.",
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Take this outside",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "Explore a sample instead" }),
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Take this outside",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("offers a new nonoverlapping sample set while respecting visual choice", async () => {
    const user = userEvent.setup();
    render(createElement(App));
    await user.click(
      screen.getByRole("checkbox", { name: "Skip listening activities" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Explore a sample instead" }),
    );
    const before = Array.from(
      document.querySelectorAll(".mission-list h3"),
    ).map((e) => e.textContent);
    await user.click(screen.getByRole("button", { name: "Try another set" }));
    const after = Array.from(document.querySelectorAll(".mission-list h3")).map(
      (e) => e.textContent,
    );
    expect(after).toHaveLength(3);
    expect(after.some((title) => before.includes(title))).toBe(false);
    await user.click(screen.getByRole("button", { name: "Take this outside" }));
    expect(
      JSON.parse(localStorage.getItem("outward.active.v1")!).plan.input
        .excludeListening,
    ).toBe(true);
  });
  it("previews import, cancels safely, then restores without replacing existing notes", async () => {
    const user = userEvent.setup();
    localStorage.setItem("outward.journal.v1", JSON.stringify([fixtureNote()]));
    render(createElement(App));
    await user.click(screen.getByRole("button", { name: /Field notes/ }));
    const upload = screen.getByLabelText("Choose an Outward backup");
    await user.upload(
      upload,
      backupFile([fixtureNote("new-note", "A long shadow crossed the path.")]),
    );
    expect(
      await screen.findByRole("heading", { name: "Bring your notes back." }),
    ).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "Keep things as they are" }),
    );
    await user.upload(
      upload,
      backupFile([fixtureNote("new-note", "A long shadow crossed the path.")]),
    );
    await user.click(
      await screen.findByRole("button", { name: "Restore notes" }),
    );
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!),
    ).toHaveLength(2);
    expect(screen.getByText("A cedar moved in the wind.")).toBeTruthy();
    expect(screen.getByText("A long shadow crossed the path.")).toBeTruthy();
  });
  it("rejects a conflicting backup and preserves original notes", async () => {
    const user = userEvent.setup();
    localStorage.setItem("outward.journal.v1", JSON.stringify([fixtureNote()]));
    render(createElement(App));
    await user.click(screen.getByRole("button", { name: /Field notes/ }));
    await user.upload(
      screen.getByLabelText("Choose an Outward backup"),
      backupFile([fixtureNote("note-one", "Changed content")]),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!)[0].note,
    ).toBe("A cedar moved in the wind.");
  });
  it("requires confirmation before deletion and supports Undo", async () => {
    const user = userEvent.setup();
    localStorage.setItem("outward.journal.v1", JSON.stringify([fixtureNote()]));
    render(createElement(App));
    await user.click(screen.getByRole("button", { name: /Field notes/ }));
    await user.click(
      screen.getByRole("button", { name: "Delete note: Watch the invisible" }),
    );
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!),
    ).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Keep note" }));
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "Delete note: Watch the invisible" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete note" }));
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!),
    ).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      JSON.parse(localStorage.getItem("outward.journal.v1")!),
    ).toHaveLength(1);
    expect(screen.getByText("A cedar moved in the wind.")).toBeTruthy();
  });
  it("does not silently discard the oldest note at capacity", async () => {
    const user = userEvent.setup();
    const full = Array.from({ length: 100 }, (_, i) => fixtureNote(`id-${i}`));
    localStorage.setItem("outward.journal.v1", JSON.stringify(full));
    render(createElement(App));
    await user.click(
      screen.getByRole("button", { name: "Explore a sample instead" }),
    );
    await user.click(screen.getByRole("button", { name: "Take this outside" }));
    await user.click(screen.getByRole("button", { name: "I'm back" }));
    await user.click(
      screen.getByRole("button", { name: "Save my field note" }),
    );
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("outward.journal.v1")!)).toEqual(
      full,
    );
    expect(
      screen.getByRole("button", { name: "Review oldest note to make room" }),
    ).toBeTruthy();
  });
});
