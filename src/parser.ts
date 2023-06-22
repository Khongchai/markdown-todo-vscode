import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from "vscode";

export interface TODOSection {
  date: ParsedDate;
  items: ParsedTodo[];
}

export interface ParsedDate {
  date: Date;
  range: Range;
}

export interface ParsedTodo {
  range: Range;
}

export interface ParserSettings {
  errorIfLessThanDays: number;
  infoIfLessThanDays: number;
  warningIfLessThanDays: number;
  hintIfLessThanDays: number;
}

export class DiagnosticsParser {
  private readonly settings: ParserSettings;

  /**
   * Reusable diagnostics array.
   */
  private diagnostics: Diagnostic[] = [];

  constructor({ settings }: { settings?: ParserSettings }) {
    this.settings = settings ?? {
      errorIfLessThanDays: 2,
      warningIfLessThanDays: 4,
      infoIfLessThanDays: 6,
      hintIfLessThanDays: 8,
    };
  }

  parse(document: TextDocument): Diagnostic[] {
    const lineLength = document.lineAt(0).text.length;
    const range = new Range(0, 0, 0, lineLength);
    this.diagnostics.push(
      new Diagnostic(range, "test message", DiagnosticSeverity.Error)
    );

    return this.diagnostics;
  }
}
