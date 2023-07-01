import { Diagnostic, Range } from "vscode";
import { ParsedTODO, ReportedDiagnostic } from "./parsingService/types";

export class TODOSection {
  /**
   * The diagnostic associated with this date.
   */
  private _sectionDiagnostics: ReportedDiagnostic | null;
  private _items: ParsedTODO[];

  constructor(sectionDiagnostics: ReportedDiagnostic | null) {
    this._items = [];
    this._sectionDiagnostics = sectionDiagnostics;
  }

  /**
   * @param diagnostics the array to add to
   */
  public addTodoItemsDiagnostics(diagnostics: Diagnostic[]): void {
    if (!this._sectionDiagnostics || !this._items.length) return;

    for (const item of this._items) {
      // We report diagnostics error at the entire todo line.
      const range = new Range(item.line, 0, item.line, item.content.length);
      diagnostics.push({
        range,
        message: this._sectionDiagnostics.message,
        severity: this._sectionDiagnostics.sev,
      });
    }
  }

  public get hasItems(): boolean {
    return this._items.length > 0;
  }

  public setDiagnostic(diagnostic: ReportedDiagnostic | null) {
    this._sectionDiagnostics = diagnostic;
  }

  public getSeverity(): ReportedDiagnostic | null {
    return this._sectionDiagnostics;
  }

  public addTodoItem(item: string, line: number) {
    this._items.push({ content: item, line });
  }
}
