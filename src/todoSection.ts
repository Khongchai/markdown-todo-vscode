import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { ParsedTODO, ReportedDiagnostic } from "./parsingService/types";

export class TODOSection {
  /**
   * The diagnostic associated with this date.
   */
  private _reportedDiagnostics: ReportedDiagnostic | null;
  private _items: ParsedTODO[];

  constructor() {
    this._items = [];
    this._reportedDiagnostics = null;
  }

  /**
   * @param diagnostics the array to add to
   */
  public addDiagnosticsIfAny(diagnostics: Diagnostic[]): void {
    if (!this._reportedDiagnostics || !this._items.length) return;

    for (const item of this._items) {
      // We report diagnostics error at the entire todo line.
      const range = new Range(item.line, 0, item.line, item.content.length);
      diagnostics.push({
        range,
        message: this._reportedDiagnostics.message,
        severity: this._reportedDiagnostics.sev,
      });
    }
  }

  public clear() {
    this._items = [];
    this._reportedDiagnostics = null;
  }

  public setDiagnostic(diagnostic: ReportedDiagnostic | null) {
    this._reportedDiagnostics = diagnostic;
  }

  public getSeverity(): ReportedDiagnostic | null {
    return this._reportedDiagnostics;
  }

  public setTodoItem(item: string, line: number) {
    this._items.push({ content: item, line });
  }
}
