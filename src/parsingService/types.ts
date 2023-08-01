import { DiagnosticSeverity } from "vscode";

export interface ParsedDateline {
  content: string;
  line: number;
  // - [ ] or - [x] || - [X]
  isChecked: boolean;
}

export interface ReportedDiagnostic {
  sev: DiagnosticSeverity;
  message: string;
}

/**
 * Arbitrarily-sized token. Can be a single char, or a sequence of char.
 */
export const enum Token {
  newLine,
  date,
  // - [ ]
  todoItem,
  // - [x]
  finishedTodoItem,
  lineEnd,
  sectionEnd,
  tripleBackTick,
  commentStart,
  commentEnd,
}

export interface DaySettings {
  critical: number;
  deadlineApproaching: number;
}
