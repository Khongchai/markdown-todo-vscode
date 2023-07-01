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
  lineEnd,
  todoItem,
}

export interface DaySettings {
  critical: number;
  deadlineApproaching: number;
  shouldProbablyBeginWorkingOnThis: number;
}
