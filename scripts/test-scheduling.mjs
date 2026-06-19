import assert from "node:assert/strict";
import { maximizeScheduleAssignments } from "../src/lib/maximize-schedule.ts";

const slots = [
  { id: "mon-19", day: "월", hour: 19, capacity: 1, isClosed: false },
  { id: "mon-20", day: "월", hour: 20, capacity: 1, isClosed: false },
  { id: "tue-07", day: "화", hour: 7, capacity: 1, isClosed: false },
  { id: "wed-19", day: "수", hour: 19, capacity: 1, isClosed: false },
  { id: "fri-19", day: "금", hour: 19, capacity: 1, isClosed: false },
];

const adversarialCohort = [
  { id: "1", name: "김지원", preferredSlotIds: ["mon-19", "mon-20"] },
  { id: "2", name: "박서윤", preferredSlotIds: ["mon-19"] },
  { id: "3", name: "최유나", preferredSlotIds: ["tue-07", "wed-19"] },
  { id: "4", name: "정수민", preferredSlotIds: ["tue-07"] },
  { id: "5", name: "한승호", preferredSlotIds: ["wed-19", "fri-19"] },
];

const fullMatch = maximizeScheduleAssignments(adversarialCohort, slots);
assert.equal(fullMatch.assignments.length, 5, "all five responders must be assigned");
assert.equal(fullMatch.unassigned.length, 0);
assert.equal(fullMatch.assignments.find((item) => item.studentName === "박서윤")?.slotId, "mon-19");
assert.equal(fullMatch.assignments.find((item) => item.studentName === "정수민")?.slotId, "tue-07");

const closedSlotResult = maximizeScheduleAssignments(adversarialCohort, [
  ...slots.filter((slot) => slot.id !== "mon-19"),
  { ...slots[0], isClosed: true },
]);
assert.equal(closedSlotResult.assignments.length, 4);
assert.equal(closedSlotResult.unassigned.length, 1);

const capacityResult = maximizeScheduleAssignments(
  [
    { id: "a", name: "A", preferredSlotIds: ["group"] },
    { id: "b", name: "B", preferredSlotIds: ["group"] },
  ],
  [{ id: "group", day: "토", hour: 10, capacity: 2, isClosed: false }],
);
assert.equal(capacityResult.assignments.length, 2, "slot capacity must be respected");

console.log("scheduling tests passed: maximum matching, closed slots, capacity");
