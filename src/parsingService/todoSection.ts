import { Diagnostic, Range } from "vscode";
import { ParsedTODO, ReportedDiagnostic } from "./types";

export class TODOSection {
  /**
   * The diagnostic associated with this date.
   */
  private _sectionDiagnostics: ReportedDiagnostic | null;
  private _items: ParsedTODO[];
  private _theLineDateIsOn: number;
  private _date: Date;

  constructor(
    sectionDiagnostics: ReportedDiagnostic | null,
    line: number,
    date: Date
  ) {
    this._items = [];
    this._sectionDiagnostics = sectionDiagnostics;
    this._theLineDateIsOn = line;
    this._date = date;
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

  /**
   * @returns Yeah, just to be clear - this is the line number of the date, not the todo items.
   */
  public getTheLineDateIsOn(): number {
    return this._theLineDateIsOn;
  }

  public getDate(): Date {
    return this._date;
  }
}
