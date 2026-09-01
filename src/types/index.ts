export type DateString = string;

export interface Task {
  id: string;
  content: string;
  creation_date: DateString;
  completion_date: DateString | null;
  is_deleted: boolean;
  order_index: number;
  auto_rollover: boolean;
}

export interface AppState {
  tasks: Task[];
  targetDate: DateString;
}
