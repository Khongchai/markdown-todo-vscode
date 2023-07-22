import { DiagnosticSeverity } from "vscode";

export interface ParsedDateline {
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
  sectionEnd,
  tripleBackTick,
}

export interface DaySettings {
  critical: number;
  deadlineApproaching: number;
}
