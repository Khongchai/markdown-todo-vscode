import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { messages } from "./constants";
import DateUtil from "./dateUtils";
import { ParsedItem } from "./parsedItem";
import { DaySettings, ReportedDiagnostic, SectionMoveDetail } from "./types";

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
  // An object with key of string and value of deadlines
  private _items: ParsedItem[];
  /**
   * A fast lookup table of a content of the items in this section
   *
   * This collection does not include the `- [ ]` part
   */
  private _contentSet: Set<string>;
  /**
   * Whether this was created using date or time syntax.
   */
  private _origin: "date" | "time";
  private _line: number;
  private _date: {
    instance: Date;
    /**
     * Just something we use as identity.
     */
    originalString: string;
  };
  private _containsUnfinishedItems?: boolean;
  /**
   * The diagnostic range that contains diagnostic metadata for the line the date is on.
   */
  private _dateDiagnosticRange?: Diagnostic;
  private _skipConditions: SkipSwitch;
  private _config: {
    today?: Date;
    settings: DaySettings;
  };
  /**
   * The parent section. This only exists if this section is a time section.
   */
  private _parent: DeadlineSection | null;
  private _startPosition: number;

  public constructor({
    date,
    line,
    skipConditions,
    config,
    startPosition,
    origin,
  }: {
    origin: "date" | "time";
    line: number;
    startPosition: number;
    date: {
      instance: Date;
      originalString: string;
    };
    skipConditions: SkipSwitch;
    config: {
      now?: Date;
      settings: DaySettings;
    };
  }) {
    this._origin = origin;
    this._items = [];
    this._contentSet = new Set();
    this._line = line;
    this._startPosition = startPosition;
    this._date = date;
    this._containsUnfinishedItems = undefined;
    this._dateDiagnosticRange = undefined;
    this._skipConditions = skipConditions;
    this._parent = null;
    this._config = {
      settings: config.settings,
      today: config.now,
    };
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

    if (!this._dateDiagnosticRange) return;

    diagnostics.push(this._dateDiagnosticRange);
  }

  public setParent(parent: DeadlineSection) {
    this._parent = parent;
  }

  public getParent(): DeadlineSection | null {
    return this._parent;
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
          range: new Range(
            item.line,
            item.lineStartOffset,
            item.line,
            item.lineStartOffset + item.content.length
          ),
          severity: DiagnosticSeverity.Information,
        });
      }
      return;
    }

    if (!this._dateDiagnosticRange || !this._items.length) return;

    for (const item of this._items) {
      if (item.isChecked) continue;
      // We report diagnostics error at the first non-whitespace char.
      const range = new Range(
        item.line,
        item.lineStartOffset,
        item.line,
        item.lineStartOffset + item.content.length
      );
      diagnostics.push({
        range,
        message: this._dateDiagnosticRange.message,
        severity: this._dateDiagnosticRange.severity,
      });
    }
  }

  public get hasItems(): boolean {
    return this._items.length > 0;
  }

  public setDate(date: Date) {
    this._date.instance = date;
  }

  public addTodoItem(
    item: string,
    lineOffset: number,
    line: number,
    isChecked: boolean
  ) {
    // If we haven't seen any unfinished items yet, and this item is unfinished, then we have seen an unfinished item.
    if (this._containsUnfinishedItems === undefined && !isChecked) {
      this._containsUnfinishedItems = true;
    }
    const newItem = new ParsedItem(item, line, lineOffset, isChecked);
    this._items.push(newItem);
    this._contentSet.add(newItem.getListContent());
  }

  /**
   * Validate that there is an item in the next section that shares the exact same message as the item in this section.
   *
   * @param requestee the section to validate if it contains the items of this section.
   */
  public validateItemsMove(requestee: DeadlineSection) {
    if (requestee._date.originalString === this._date.originalString) return;
    if (this._items.length === 0) return;
    const itemsNotDeposited: ParsedItem[] = [];
    for (const item of this._items) {
      // checked items are basically ignored from this validation
      if (item.isChecked) continue;

      const foundItem = requestee._contentSet.has(item.getListContent());
      if (foundItem) continue;
      // if the item is not found to be in the requestee, then it has not been moved successfully.
      itemsNotDeposited.push(item);
    }
    // In the happy path, the length of the itemsNotDeposited array should be 0.
    this._items = itemsNotDeposited;
  }

  public runDiagnosticCheck(): Readonly<ReportedDiagnostic> | null {
    const now = this._config?.today ?? new Date();
    const itemDate = this._date.instance;
    const diffTime = itemDate.getTime() - now.getTime();
    const { critical, deadlineApproaching } = this._config.settings;
    const criticalMilli = DateUtil.dayToMilli(critical);
    const deadlineApproachingMilli = DateUtil.dayToMilli(deadlineApproaching);

    const message = DateUtil.getDistanceFromDateToNow(itemDate);

    if (diffTime <= 0) {
      return {
        sev: DiagnosticSeverity.Error,
        message,
      };
    } else if (diffTime < criticalMilli) {
      return {
        sev: DiagnosticSeverity.Warning,
        message,
      };
    } else if (diffTime < deadlineApproachingMilli) {
      return {
        sev: DiagnosticSeverity.Information,
        message,
      };
    }

    return null;
  }

  /**
   * Possible diagnostics error. This section will apply this diagnostics only if it is not empty.
   */
  public setPotentialDiagnostic(diagnostics: Diagnostic): void {
    this._dateDiagnosticRange = diagnostics;
  }

  /**
   * @returns Yeah, just to be clear - this is the line number of the date, not the todo items.
   */
  public getTheLineDateIsOn(): number {
    return this._line;
  }

  public getDateStartPosition(): number {
    return this._startPosition;
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

  public isSkipped(): boolean {
    return this._skipConditions.skip;
  }

  public getOrigin() {
    return this._origin;
  }
}
