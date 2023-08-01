import { Diagnostic, Range } from "vscode";
import { ParsedDateline, ReportedDiagnostic } from "./types";

export class DeadlineSection {
  /**
   * The diagnostic associated with this date.
   */
  private _sectionDiagnostics: ReportedDiagnostic | null;
  private _items: ParsedDateline[];
  private _theLineDateIsOn: number;
  private _date: Date;
  private _containsUnfinishedItems?: boolean;
  private _potentialDiagnosticsRange?: Diagnostic;

  constructor(
    sectionDiagnostics: ReportedDiagnostic | null,
    line: number,
    date: Date
  ) {
    this._items = [];
    this._sectionDiagnostics = sectionDiagnostics;
    this._theLineDateIsOn = line;
    this._date = date;
    this._containsUnfinishedItems = undefined;
    this._potentialDiagnosticsRange = undefined;
  }

  /**
   * @param diagnostics the array to add to
   */
  public addTodoItemsDiagnostics(diagnostics: Diagnostic[]): void {
    if (!this._sectionDiagnostics || !this._items.length) return;

    for (const item of this._items) {
      if (item.isChecked) continue;
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

  public addTodoItem(item: string, line: number, isChecked: boolean) {
    // If we haven't seen any unfinished items yet, and this item is unfinished, then we have seen an unfinished item.
    if (this._containsUnfinishedItems === undefined && !isChecked) {
      this._containsUnfinishedItems = true;
    }
    this._items.push({ content: item, line, isChecked });
  }

  public addPotentialDiagnostics(diagnostics: Diagnostic) {
    this._potentialDiagnosticsRange = diagnostics;
  }

  public addDateDiagnostics(diagnostics: Diagnostic[]) {
    if (!this._potentialDiagnosticsRange) return;
    diagnostics.push(this._potentialDiagnosticsRange);
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

  public getContainsUnfinishedItems(): boolean {
    return this._containsUnfinishedItems ?? false;
  }
}
