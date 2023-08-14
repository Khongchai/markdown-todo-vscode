import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { ParsedItem, ReportedDiagnostic, SectionMoveDetail } from "./types";
import { messages } from "./constants";

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
  // An object with key of string and value of deadlines
  private _items: ParsedItem[];
  // a O(1) table at hand to check if it contains a piece of content
  private _contentSet: Set<string>;
  private _location: number;
  private _date: {
    instance: Date;
    originalString: string;
  };
  private _containsUnfinishedItems?: boolean;
  private _potentialDiagnosticsRange?: Diagnostic;
  private _skipConditions: SkipSwitch;

  constructor({
    date,
    line,
    sectionDiagnostics,
    skipConditions,
  }: {
    sectionDiagnostics: ReportedDiagnostic | null;
    line: number;
    date: {
      instance: Date;
      originalString: string;
    };
    skipConditions: SkipSwitch;
  }) {
    this._items = [];
    this._contentSet = new Set();
    this._sectionDiagnostics = sectionDiagnostics;
    this._location = line;
    this._date = date;
    this._containsUnfinishedItems = undefined;
    this._potentialDiagnosticsRange = undefined;
    this._skipConditions = skipConditions;
  }

  /**
   * Will either add the diagnostics to the line the date is on, or to the move comment.
   */
  public addDateDiagnostics(diagnostics: Diagnostic[]) {
    if (this._skipConditions.skip) return;

    if (this.isRegisteredForExtraction()) {
      if (this._items.length === 0) return;

      const { commentLength, commentLine, dateString } = this._skipConditions
        .move as SectionMoveDetail;

      const registeredToItself = dateString === this._date.originalString;
      if (registeredToItself) {
        diagnostics.push({
          range: new Range(commentLine, 0, commentLine, commentLength),
          message: messages.selfRegistered,
          severity: DiagnosticSeverity.Information,
        });
      } else {
        // add one diagnostics to the comment line
        diagnostics.push({
          message: messages.notAllItemsMoved,
          range: new Range(commentLine, 0, commentLine, commentLength),
          severity: DiagnosticSeverity.Information,
        });
      }

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

    if (this.isRegisteredForExtraction()) {
      if (this._items.length === 0) return;
      for (const item of this._items) {
        if (item.isChecked) continue;
        diagnostics.push({
          message: messages.itemNotMoved,
          range: new Range(item.line, 0, item.line, item.content.length),
          severity: DiagnosticSeverity.Information,
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
    this._contentSet.add(item);
  }

  /**
   * Validate that there is an item in the next section that shares the exact same message as the item in this section.
   */
  public validateItemsMove(section: DeadlineSection) {
    if (section._date.originalString === this._date.originalString) return;
    if (this._items.length === 0) return;
    const itemsNotDeposited: ParsedItem[] = [];
    for (const item of this._items) {
      const foundItem = section._contentSet.has(item.content);
      if (foundItem) continue;
      // checked items are basically ignored from this validation
      if (item.isChecked) continue;
      // if the item is not found to be in the next section, then it has not been moved successfully.
      itemsNotDeposited.push(item);
    }

    // In the happy path, the length of the itemsNotDeposited array should be 0.
    this._items = itemsNotDeposited;
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
    return this._date.instance;
  }

  public get containsUnfinishedItems() {
    return this._containsUnfinishedItems !== undefined
      ? this._containsUnfinishedItems && this.hasItems
      : false;
  }

  public isRegisteredForExtraction(): boolean {
    return this._skipConditions.move && !!this._skipConditions.move.dateString;
  }
}
