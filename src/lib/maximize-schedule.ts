export type MatchingStudent = {
  id: string;
  name: string;
  preferredSlotIds: string[];
};

export type MatchingSlot = {
  id: string;
  day: string;
  hour: number;
  capacity: number;
  isClosed: boolean;
};

export type ScheduleAssignment = {
  studentId: string;
  studentName: string;
  slotId: string;
  day: string;
  hour: number;
};

export type MatchingResult = {
  assignments: ScheduleAssignment[];
  unassigned: Array<{ studentId: string; studentName: string; reason: string }>;
};

/**
 * Maximum-cardinality bipartite matching between students and slot capacity
 * units. Closed slots and zero-capacity slots are excluded before matching.
 */
export function maximizeScheduleAssignments(
  students: MatchingStudent[],
  slots: MatchingSlot[],
): MatchingResult {
  const openSlots = new Map(
    slots
      .filter((slot) => !slot.isClosed && slot.capacity > 0)
      .map((slot) => [slot.id, slot]),
  );
  const studentById = new Map(students.map((student) => [student.id, student]));
  const unitsBySlotId = new Map<string, string[]>();

  for (const slot of openSlots.values()) {
    unitsBySlotId.set(
      slot.id,
      Array.from({ length: slot.capacity }, (_, index) => `${slot.id}::${index}`),
    );
  }

  const preferredUnits = new Map(
    students.map((student) => [
      student.id,
      student.preferredSlotIds.flatMap((slotId) => unitsBySlotId.get(slotId) ?? []),
    ]),
  );
  const unitToStudent = new Map<string, string>();

  function findAugmentingPath(
    studentId: string,
    visitedUnits: Set<string>,
    visitedStudents: Set<string>,
  ): boolean {
    if (visitedStudents.has(studentId)) return false;
    visitedStudents.add(studentId);

    for (const unitId of preferredUnits.get(studentId) ?? []) {
      if (visitedUnits.has(unitId)) continue;
      visitedUnits.add(unitId);
      const occupyingStudentId = unitToStudent.get(unitId);

      if (
        occupyingStudentId === undefined ||
        findAugmentingPath(occupyingStudentId, visitedUnits, visitedStudents)
      ) {
        unitToStudent.set(unitId, studentId);
        return true;
      }
    }

    return false;
  }

  // Scarce-choice students first improves stability; augmenting paths still
  // guarantee maximum cardinality regardless of this ordering.
  const orderedStudents = [...students].sort((a, b) => {
    const choiceDelta = (preferredUnits.get(a.id)?.length ?? 0) - (preferredUnits.get(b.id)?.length ?? 0);
    return choiceDelta || a.id.localeCompare(b.id);
  });

  for (const student of orderedStudents) {
    findAugmentingPath(student.id, new Set(), new Set());
  }

  const assignmentByStudent = new Map<string, ScheduleAssignment>();
  for (const [unitId, studentId] of unitToStudent) {
    const slotId = unitId.slice(0, unitId.lastIndexOf("::"));
    const slot = openSlots.get(slotId);
    const student = studentById.get(studentId);
    if (!slot || !student) continue;
    assignmentByStudent.set(studentId, {
      studentId,
      studentName: student.name,
      slotId,
      day: slot.day,
      hour: slot.hour,
    });
  }

  const assignments = students.flatMap((student) => {
    const assignment = assignmentByStudent.get(student.id);
    return assignment ? [assignment] : [];
  });
  const unassigned = students
    .filter((student) => !assignmentByStudent.has(student.id))
    .map((student) => ({
      studentId: student.id,
      studentName: student.name,
      reason: (preferredUnits.get(student.id)?.length ?? 0) === 0
        ? "선택한 시간이 모두 닫혔어요"
        : "선택한 시간이 다른 회원과 모두 겹쳐요",
    }));

  return { assignments, unassigned };
}
