import { DiagnosticSeverity } from "vscode";

export interface SectionMoveDetail {
  dateString: string;
  commentLine: number;
  commentLength: number;
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
  date, // 01/08/1997
  time, // 15:00
  // - [ ]
  todoItem,
  // - [x]
  finishedTodoItem,
  lineEnd,
  tripleBackTick,
  commentStart,
  commentEnd,

  // comment idents
  sectionEndIdent,
  skipIdent,
  movedIdent,
}

export interface DaySettings {
  critical: number;
  deadlineApproaching: number;
}
