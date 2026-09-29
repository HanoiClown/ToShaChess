import { useMemo } from "react";
import { TrainingHub, type TrainingHubApi } from "./TrainingHub";
import { useApp } from "../ui/context";
import { engineRequest } from "../shared/engine-requests";
import { useEnginePacks } from "../ui/EnginePacks";
export function Training() {
  const { profile, locale, snapshot, playFrom, nav } = useApp(),
    { packs } = useEnginePacks();
  const hasMaia = packs.some(
    (p) => p.id === "maia-cpu" && p.status === "ready",
  );
  const api = useMemo<TrainingHubApi>(() => {
    const requests = new Set<ReturnType<typeof engineRequest>>();
    async function withRequest<T>(
      fn: (request: ReturnType<typeof engineRequest>) => Promise<T>,
    ) {
      const request = engineRequest();
      requests.add(request);
      try {
        return await fn(request);
      } finally {
        requests.delete(request);
      }
    }
    return {
      list: () => window.chessApp.listTrainingCards(),
      save: (card) => window.chessApp.saveTrainingCard(card),
      review: (input) => window.chessApp.reviewTrainingCard(input),
      postpone: (id) => window.chessApp.postponeTrainingCard(id),
      delete: (id) => window.chessApp.deleteTrainingCard(id),
      studies: () => window.chessApp.listStudies(),
      analyze: (position) => withRequest((r) => r.analyze(position)),
      ...(hasMaia
        ? {
            predict: (position: import("../shared/contracts").Position) =>
              withRequest((r) =>
                window.chessApp.predictHuman({
                  requestId: r.requestId,
                  position,
                  pack: "maia-cpu",
                  selfElo: 1100,
                  opponentElo: 1100,
                }),
              ),
          }
        : {}),
      cancel: () => {
        requests.forEach((r) => r.cancel());
        requests.clear();
      },
    };
  }, [profile.id, hasMaia]);
  return (
    <TrainingHub
      profileId={profile.id}
      locale={locale}
      games={snapshot.database.games}
      api={api}
      onPlayFrom={playFrom}
      onExit={() => nav("learn")}
    />
  );
}
