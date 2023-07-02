import { DiagnosticSeverity } from "vscode";

export interface ParsedTODO {
  content: string;
  line: number;
}

export interface ReportedDiagnostic {
  sev: DiagnosticSeverity;
  message: string;
}

export const enum Token {
  newLine,
  date,
  todoItem,
  lineEnd,
  /**
   * Everything else
   */
  other,
}

export interface DaySettings {
  critical: number;
  deadlineApproaching: number;
  shouldProbablyBeginWorkingOnThis: number;
}
