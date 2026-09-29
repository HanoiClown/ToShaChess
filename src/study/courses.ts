import {
  coursePaths,
  type Course,
  type CourseChapter,
} from "../library/courses";
import type { Locale } from "../shared/contracts";
import {
  addStudyMove,
  createStudy,
  updateStudyNode,
  validateStudy,
} from "./tree";
export function studyFromCourse(
  course: Course,
  chapter: CourseChapter,
  profileId: string,
  locale: Locale,
) {
  let study = createStudy({
    profileId,
    title: `${course.title[locale]} — ${chapter.title[locale]}`,
    initialFen: chapter.initialFen,
    sourceKey: `course_${course.id}_${chapter.id}`,
  });
  study = updateStudyNode(study, study.rootId, {
    kind: "lesson",
    explanation: {
      short: { ru: chapter.notes.ru[0], en: chapter.notes.en[0] },
      detail: chapter.summary,
      sources: chapter.sources,
    },
  });
  for (const path of coursePaths(chapter)) {
    let parentId = study.rootId;
    path.line.forEach((move, i) => {
      study = addStudyMove(study, parentId, move, "lesson");
      parentId = study.selectedNodeId;
      if (
        !study.nodes[parentId].explanation &&
        path.notes.ru[i + 1] &&
        path.notes.en[i + 1]
      )
        study = updateStudyNode(study, parentId, {
          explanation: {
            short: { ru: path.notes.ru[i + 1], en: path.notes.en[i + 1] },
            ...(path.details?.ru[i + 1] && path.details.en[i + 1]
              ? {
                  detail: {
                    ru: path.details.ru[i + 1],
                    en: path.details.en[i + 1],
                  },
                }
              : {}),
            sources: path.sources,
          },
        });
    });
  }
  study.selectedNodeId = study.rootId;
  return validateStudy(study);
}
