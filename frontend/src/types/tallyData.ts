export type TallySyncStepResult = {
  source_table: string;
  target_table: string;
  source_count: number;
  target_count_before: number;
  target_count_after: number;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
};

export type TallySyncSessionResponse = {
  started_at: string;
  completed_at: string;
  steps: TallySyncStepResult[];
  message: string;
};
