import { useEffect, useRef, useState } from "react";
import { useApp } from "../ui/context";
import {
  createStudy,
  getStudyPosition,
  type StudyDocument,
} from "../study/tree";
import { StudyWorkspace } from "../ui/StudyWorkspace";
import { engineRequest } from "../shared/engine-requests";
import { cardFromStudy } from "../training/cards";
import { PositionTools } from "../ui/PositionTools";
import { addStudyMove } from "../study/tree";
import { StudySaveQueue } from "../study/save-queue";
export function Studies() {
  const { profile, locale, l, reviewId, playFrom, fail, nav } = useApp();
  const [list, setList] = useState<StudyDocument[]>([]),
    [study, setStudy] = useState<StudyDocument | null>(null),
    [status, setStatus] = useState("");
  const request = useRef<ReturnType<typeof engineRequest> | null>(null);
  const queue = useRef(new StudySaveQueue());
  const pending = useRef(queue.current.pending),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  const [removeId, setRemoveId] = useState<string | null>(null);
  function flush() {
    clearTimeout(timer.current);
    return queue.current
      .flush((document) => window.chessApp.saveStudy(document))
      .then(async () => {
        if (alive.current) {
          const saved = await window.chessApp.listStudies();
          if (alive.current) {
            setList(saved.map((item) => pending.current.get(item.id) ?? item));
            if (!pending.current.size)
              setStatus(l("Изменения сохранены.", "Changes saved."));
          }
        }
      })
      .catch((error) => {
        if (alive.current)
          setStatus(
            l(
              "Не удалось сохранить. Повтори сохранение.",
              "Could not save. Please retry saving.",
            ),
          );
        throw error;
      });
  }
  function change(next: StudyDocument) {
    setStudy(next);
    setList((items) =>
      items.map((item) => (item.id === next.id ? next : item)),
    );
    pending.current.set(next.id, next);
    setStatus(l("Сохраняем…", "Saving…"));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush().catch(fail), 400);
  }
  useEffect(() => {
    alive.current = true;
    const settle = async () => {
      do {
        await flush();
      } while (pending.current.size);
    };
    const beforeSwitch = (event: Event) =>
      (event as CustomEvent<Promise<unknown>[]>).detail.push(settle());
    window.addEventListener("chess-before-switch", beforeSwitch);
    return () => {
      alive.current = false;
      window.removeEventListener("chess-before-switch", beforeSwitch);
      void flush().catch(fail);
    };
  }, [profile.id]);
  useEffect(() => {
    let active = true;
    void window.chessApp
      .listStudies()
      .then((items) => {
        if (active) {
          setList(items);
          setStudy(items.find((s) => s.id === reviewId) ?? items[0] ?? null);
        }
      })
      .catch(fail);
    return () => {
      active = false;
      request.current?.cancel();
    };
  }, [profile.id, reviewId]);
  async function save(value: StudyDocument) {
    pending.current.set(value.id, value);
    await flush();
  }
  async function create() {
    const next = createStudy({
      profileId: profile.id,
      title: l("Новое исследование", "New study"),
    });
    await save(next);
    setStudy(next);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("Мои исследования", "My studies")}</h1>
          <p>
            {l(
              "Варианты, заметки и закладки сохраняются в твоём профиле.",
              "Variations, notes and bookmarks belong to your profile.",
            )}
          </p>
        </div>
        <button className="primary" onClick={() => void create().catch(fail)}>
          {l("Новое исследование", "New study")}
        </button>
      </div>
      {list.length > 0 && (
        <label className="study-select">
          {l("Открыть исследование", "Open study")}
          <select
            value={study?.id ?? ""}
            onChange={(e) => {
              setStudy(list.find((s) => s.id === e.target.value) ?? null);
              setStatus("");
            }}
          >
            {list.map((s) => (
              <option value={s.id} key={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {study ? (
        <>
          <div className="personal-study">
            <StudyWorkspace
              key={study.id}
              study={study}
              onChange={change}
              locale={locale}
              defaultDetailed={profile.learning?.explanation === "detailed"}
              onSave={save}
              onPlayFrom={playFrom}
              onAnalyze={async (position) => {
                request.current?.cancel();
                request.current = engineRequest();
                return request.current.analyze(position);
              }}
              analysisTools={
                <PositionTools
                  locale={locale}
                  position={getStudyPosition(study)}
                  onOpenSettings={() => nav("settings")}
                  onPlayMove={(uci) =>
                    change(
                      addStudyMove(study, study.selectedNodeId, uci, "engine"),
                    )
                  }
                />
              }
            />
          </div>
          <div className="study-actions">
            <button
              className="secondary"
              disabled={!study.nodes[study.selectedNodeId].mainChildId}
              onClick={() => {
                void window.chessApp
                  .saveTrainingCard(cardFromStudy(study))
                  .then(() =>
                    setStatus(
                      l(
                        "Позиция добавлена в личные повторения.",
                        "Position added to your review queue.",
                      ),
                    ),
                  )
                  .catch(fail);
              }}
            >
              {l("Добавить в повторения", "Add to review queue")}
            </button>
            <button
              className="text-button"
              onClick={() => setRemoveId(study.id)}
            >
              {l("Удалить исследование", "Delete study")}
            </button>
          </div>
          {removeId === study.id && (
            <div className="pack-confirm">
              <p>
                {l(
                  "Удалить это исследование с вариантами и заметками?",
                  "Delete this study, including its variations and notes?",
                )}
              </p>
              <button
                className="secondary"
                onClick={() =>
                  void flush()
                    .then(() => window.chessApp.deleteStudy(study.id))
                    .then(async () => {
                      const items = await window.chessApp.listStudies();
                      setList(items);
                      setStudy(items[0] ?? null);
                      setRemoveId(null);
                    })
                    .catch(fail)
                }
              >
                {l("Да, удалить", "Yes, delete")}
              </button>
              <button className="text-button" onClick={() => setRemoveId(null)}>
                {l("Оставить", "Keep")}
              </button>
            </div>
          )}
          <p role="status">{status}</p>
        </>
      ) : (
        <p className="empty-state">
          {l(
            "Создай исследование или открой позицию из урока, разбора или конструктора.",
            "Create a study or open a position from a lesson, review or position editor.",
          )}
        </p>
      )}
    </>
  );
}
