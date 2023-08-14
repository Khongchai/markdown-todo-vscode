import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { ParsedDateline, ReportedDiagnostic, SectionMoveDetail } from "./types";
import { datePattern, messages } from "./constants";

interface SkipSwitch {
  /**
   * Skip should not cause this deadline section to not be created, but just that nothing should be reported.
   *
   * This guards against the case where the upper section is a deadline and it attempts to swallows the lower section without
   * proper closing.
   */
  skip: boolean;
  /** 
  * # moving validation
  * when moved section is asked to return diagnostics,
  * check if its meta.move is truthy, if so, it should check if its items is down to zero, if it is, return true
  * if false, it has not been moved, should return the diagnostics of the line the comment is on.

  * # moving
  * moved section "registers" its items to be desposited to another to a "move bank". The move bank is a map of the date string, and the section requesting its
  * items to be vacated. Once the section to be deposited to is found, vacate all items of the registered section to the depositee.
  */
  move: SectionMoveDetail | false;
}

export class DeadlineSection {
  /**
   * The diagnostic associated with this date.
   */
  private _sectionDiagnostics: ReportedDiagnostic | null;
  private _items: ParsedDateline[];
  private _location: number;
  private _date: Date;
  private _containsUnfinishedItems?: boolean;
  private _potentialDiagnosticsRange?: Diagnostic;
  private _skipConditions: SkipSwitch;

  constructor({
    date,
    line,
    sectionDiagnostics,
    meta,
  }: {
    sectionDiagnostics: ReportedDiagnostic | null;
    line: number;
    date: Date;
    meta: SkipSwitch;
  }) {
    this._items = [];
    this._sectionDiagnostics = sectionDiagnostics;
    this._location = line;
    this._date = date;
    this._containsUnfinishedItems = undefined;
    this._potentialDiagnosticsRange = undefined;
    this._skipConditions = meta;
  }

  public addDateDiagnostics(diagnostics: Diagnostic[]) {
    if (this._skipConditions.skip) return;

    const registeredForExtraction: boolean =
      this._skipConditions.move && !!this._skipConditions.move.dateString;
    if (registeredForExtraction) {
      if (this._items.length === 0) return;
      const { commentLength, commentLine } = this._skipConditions
        .move as SectionMoveDetail;
      // add one diagnostics to the comment line
      diagnostics.push({
        message: messages.notAllItemsMoved,
        range: new Range(commentLine, 0, commentLine, commentLength),
        severity: DiagnosticSeverity.Error,
      });

      // Don't add the diagnostics to the date itself to make it clear that diagnostics report context has changed.
      return;
    }

    if (!this._potentialDiagnosticsRange) return;

    diagnostics.push(this._potentialDiagnosticsRange);
  }

  /**
   * @param diagnostics the array to add to
   */
  public addTodoItemsDiagnostics(diagnostics: Diagnostic[]): void {
    if (this._skipConditions.skip) return;

    const registeredForExtraction =
      this._skipConditions.move && this._skipConditions.move.dateString;
    if (registeredForExtraction) {
      if (this._items.length === 0) return;
      for (const item of this._items) {
        if (item.isChecked) continue;
        diagnostics.push({
          message: messages.itemNotMoved,
          range: new Range(item.line, 0, item.line, item.content.length),
          severity: DiagnosticSeverity.Error,
        });
      }
      return;
    }

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

  /**
   * Extract the parsed items from this section.
   */
  public extractItemsTo(section: DeadlineSection) {
    if (this._items.length === 0) return;
    const items = this._items;
    this._items = [];
    for (const item of items) {
      section.addTodoItem(item.content, item.line, item.isChecked);
    }
  }

  public addPotentialDiagnostics(diagnostics: Diagnostic) {
    this._potentialDiagnosticsRange = diagnostics;
  }

  /**
   * @returns Yeah, just to be clear - this is the line number of the date, not the todo items.
   */
  public getTheLineDateIsOn(): number {
    return this._location;
  }

  public getDate(): Date {
    return this._date;
  }

  public get containsUnfinishedItems() {
    return this._containsUnfinishedItems !== undefined
      ? this._containsUnfinishedItems && this.hasItems
      : false;
  }
}
