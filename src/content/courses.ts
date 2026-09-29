import { buildCourse } from "./course-library/authoring";
import { kings } from "./course-library/kings";
import { evans } from "./course-library/evans";
import { scotch } from "./course-library/scotch";
import { goring } from "./course-library/goring";
import { danish } from "./course-library/danish";
import { vienna } from "./course-library/vienna";
import { morra } from "./course-library/morra";
import { caro } from "./course-library/caro";
import { criticalNotes } from "./course-library/critical-notes";
import { modelGames } from "./course-library/model-games";
import type { Course } from "../library/courses";

// Preserve catalogue order and stable chapter/progress IDs from the first release.
export const courses: Course[] = [
  evans,
  scotch,
  goring,
  danish,
  vienna,
  kings,
  morra,
  caro,
].map((seed) => {
  for (const [ply, note] of Object.entries(criticalNotes[seed.id]))
    seed.main.steps[Number(ply) - 1].detail = note;
  return {
    ...buildCourse(seed),
    modelGames: modelGames[seed.id as keyof typeof modelGames],
  };
});
