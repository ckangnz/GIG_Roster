import assert from "node:assert/strict";
import { test } from "node:test";

import { RosterEntry, Team, UserAssignments } from "../src/model/model";
import { resolveViewedTeamAssignments } from "../src/utils/viewedTeams";

const userIdentifier = "z@example.com";
const orgId = "church";
const createTeam = (id: string, name: string, teamOrgId = orgId): Team => ({
  id,
  orgId: teamOrgId,
  name,
  emoji: "🎵",
  positions: [],
  preferredDays: ["Sunday"],
  maxConflict: 1,
});
const allTeams = [
  createTeam("translation", "Translation"),
  createTeam("worship", "Worship"),
  createTeam("welcome", "Welcome"),
  createTeam("foreign", "Other church", "other-church"),
];
const createEntry = (teams: RosterEntry["teams"]): RosterEntry => ({
  id: "2026-10-11",
  orgId,
  date: "2026-10-11",
  teams,
  absence: {},
});
const resolve = (
  entry?: RosterEntry,
  viewedTeamIds?: string[],
  identifier = userIdentifier,
) =>
  resolveViewedTeamAssignments({
    entry,
    currentTeamId: "translation",
    userIdentifier: identifier,
    viewedTeamIds,
    allTeams,
    activeOrgId: orgId,
  }).map(({ team, positionIds }) => ({ teamId: team.id, positionIds }));

test("Translation-only viewer sees shared members' Worship roles on different dates", () => {
  for (const [subject, positionId, date] of [
    ["b@example.test", "singer", "2026-10-11"],
    ["c@example.test", "keys", "2026-10-18"],
    ["d@example.test", "drums", "2026-10-25"],
  ]) {
    const entry = createEntry({
      translation: { [subject]: ["translator"] },
      worship: { [subject]: [positionId] },
      welcome: { [subject]: ["host"] },
    });
    entry.id = date;
    entry.date = date;
    assert.deepEqual(resolve(entry, ["worship"], subject), [
      { teamId: "worship", positionIds: [positionId] },
    ]);
    assert.deepEqual(entry.teams.translation, {
      [subject]: ["translator"],
    });
  }
});

test("viewed assignments remain available when current team is blank or missing", () => {
  for (const teams of [
    { worship: { [userIdentifier]: ["B"] } },
    { translation: {}, worship: { [userIdentifier]: ["B"] } },
  ]) {
    assert.deepEqual(resolve(createEntry(teams), ["worship"]), [
      { teamId: "worship", positionIds: ["B"] },
    ]);
  }
});

test("missing preferences, empty selections, missing entry and other user preserve empty output", () => {
  const entry = createEntry({ worship: { [userIdentifier]: ["B"] } });
  assert.deepEqual(resolve(entry), []);
  assert.deepEqual(resolve(entry, []), []);
  assert.deepEqual(resolve(undefined, ["worship"]), []);
  assert.deepEqual(resolve(entry, ["worship"], "other@example.com"), []);
});

test("current, deleted, unknown and foreign teams are excluded", () => {
  const entry = createEntry(
    Object.fromEntries(
      ["translation", "worship", "deleted", "unknown", "foreign"].map(
        (teamId) => [teamId, { [userIdentifier]: ["B"] }],
      ),
    ),
  );
  assert.deepEqual(
    resolve(entry, ["translation", "deleted", "unknown", "foreign", "worship"]),
    [{ teamId: "worship", positionIds: ["B"] }],
  );
  assert.deepEqual(
    resolve({ ...entry, orgId: "other-church" }, ["worship"]),
    [],
  );
  assert.deepEqual(
    resolveViewedTeamAssignments({
      entry,
      userIdentifier,
      viewedTeamIds: ["worship"],
      allTeams,
    }),
    [],
  );
});

test("flat and daily rosters deduplicate multiple positions and selections", () => {
  const assignments: UserAssignments = {
    [userIdentifier]: ["B", "C", "B"],
    [` ${userIdentifier} `]: ["C", "D"],
  };
  for (const teamData of [
    assignments,
    { type: "daily" as const, assignments },
  ]) {
    assert.deepEqual(
      resolve(createEntry({ worship: teamData }), ["worship", "worship"]),
      [{ teamId: "worship", positionIds: ["B", "C", "D"] }],
    );
  }
});

test("cross-team slotted rosters aggregate the whole date across independent slots", () => {
  const entry = createEntry({
    translation: {
      type: "slotted",
      slots: { "translation-afternoon": {} },
    },
    worship: {
      type: "slotted",
      slots: {
        "worship-morning": { [userIdentifier]: ["B", "C"] },
        "worship-evening": { [userIdentifier]: ["C", "D"] },
      },
    },
    welcome: { type: "daily", assignments: { [userIdentifier]: ["host"] } },
  });
  assert.deepEqual(resolve(entry, ["worship", "welcome"]), [
    { teamId: "worship", positionIds: ["B", "C", "D"] },
    { teamId: "welcome", positionIds: ["host"] },
  ]);
});
