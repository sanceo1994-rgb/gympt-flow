export const PINNED_TOP_TRAINER_ID = "0b8781ee-55af-489c-9737-a4b081f596f9";

export type RankableTrainer = {
  id: string;
  created_at: string;
};

export function rankTrainerRows<T extends RankableTrainer>(trainers: T[]): T[] {
  const ordered = [...trainers].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const pinned = ordered.find((trainer) => trainer.id === PINNED_TOP_TRAINER_ID);
  const rest = ordered.filter((trainer) => trainer.id !== PINNED_TOP_TRAINER_ID);
  return [...(pinned ? [pinned] : []), ...rest];
}

export function getTrainerRank<T extends RankableTrainer>(trainers: T[], trainerId?: string | null) {
  if (!trainerId) return null;
  const index = rankTrainerRows(trainers).findIndex((trainer) => trainer.id === trainerId);
  return index >= 0 && index < 3 ? ((index + 1) as 1 | 2 | 3) : null;
}
