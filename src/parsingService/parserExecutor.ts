import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { DiagnosticsTokenizer } from "./tokenizer";
import {
  DaySettings,
  ReportedDiagnostic,
  SectionMoveDetail,
  Token,
} from "./types";
import { DeadlineSection as DeadlineSection } from "./todoSection";
import "../protoExtensions/protoExtensions";
import MoveBankImpl, { MoveBank } from "./moveBank";
import DateUtil from "./dateUtils";

export type DateParsedEvent = (
  section: DeadlineSection,
  line: number,
  lineEnd: number
) => void;

export interface ParserVisitor {
  /**
   * When newLine char is encountered directly after a date.
   *
   * @param date A date object representing the date that was parsed. This object is recreated on every parse.
   * @param line
   * @param lineEnd
   */
  onNewLineAtDate?: DateParsedEvent;
  /**
   * When a line ends directly after a date.
   *
   * @param date
   * @param line
   * @param lineEnd
   */
  onEndLineAtDate?: DateParsedEvent;
  onParseBegin?(): void;
  onParseEnd?(): void;
}

/**
 * A guard state of the current parsing process.
 */
class _ParsingGuard {
  todoSections!: DeadlineSection[];
  /**
   * true if the parser is currently parsing a todo item.
   *
   * For example,
   *
   * 01/01/2021
   * - [ ] todo item
   * # Some heading
   * - [ ] another todo item
   *
   * isParsingTodoItem is true when parsing the first todo item, and false when parsing the second todo item.
   *
   * This is because the second todo item is not directly under the date.
   */
  isParsingTodoSectionItem!: boolean;
  /**
   * true if the parser is currently inside a markdown code block (three backticks).
   */
  isInsideCodeBlock!: boolean;
  /**
   * true if the parser is currently inside a markdown comment (<!-- -->).
   */
  isInsideComment!: boolean;

  /**
   * true if the parser should skip the immediate next section
   */
  skipNextSection!: boolean;

  /**
   * true if the parser marks the next immediate section as moved
   */
  moveNextSection!: boolean;
  /**
   * This is only relevant & useful if moveNextSection is true
   */
  moveCommentDetail!: SectionMoveDetail & {
    reset(): void;
  };

  constructor() {
    this.reset();
  }

  /**
   * If any of the early return conditions are met, this date block should be skipped.
   */
  public checkEarlyReturnConditions(
    token: Token,
    tokenizer: DiagnosticsTokenizer
  ): "hit" | "miss" {
    switch (token) {
      case Token.tripleBackTick:
        this.isInsideCodeBlock = !this.isInsideCodeBlock;
        return "hit";
      case Token.commentStart:
        this.isInsideComment = true;
        return "hit";
      case Token.commentEnd:
        this.isInsideComment = false;
        return "hit";
      case Token.skipIdent:
        this.skipNextSection = true;
        return "hit";
      case Token.movedIdent:
        this.moveNextSection = true;
        this.moveCommentDetail.commentLine = tokenizer.getLine();
        this.moveCommentDetail.commentLength = tokenizer.getLineOffset();
        return "hit";
      default:
        if (
          (this.isInsideCodeBlock || this.isInsideComment) &&
          token !== Token.lineEnd
        ) {
          return "hit";
        }

        return "miss";
    }
  }

  public reset() {
    this.skipNextSection = false;
    this.isParsingTodoSectionItem = false;
    this.isInsideCodeBlock = false;
    this.isInsideComment = false;
    this.moveNextSection = false;
    this.todoSections = [];
    this.moveCommentDetail = {
      dateString: "",
      commentLength: 0,
      commentLine: 0,
      reset: function () {
        this.dateString = "";
        this.commentLength = 0;
        this.commentLine = 0;
      },
    };
  }
}

/**
 * To prevent confusion, Date in string xx/xx/xxxx format is assumed to have its month
 * starting at 1, like normal people.
 *
 * The Date object itself can be weird and have its month starting at 00
 */
export class DiagnosticsParser {
  private readonly _settings: DaySettings;
  private _today: Date;
  private _isUsingControllledDate: boolean;
  private _tokenizer: DiagnosticsTokenizer;
  private _visitors: ParserVisitor[];
  private _parsingState: _ParsingGuard;
  private _moveBank: MoveBank;

  public constructor({
    daySettings: settings,
    today,
    visitors,
  }: {
    daySettings?: DaySettings;
    today?: Date;
    visitors?: ParserVisitor[];
  }) {
    this._today = today ?? new Date();
    this._isUsingControllledDate = !!today;
    this._settings = settings ?? {
      critical: 2,
      deadlineApproaching: 4,
    };
    this._tokenizer = new DiagnosticsTokenizer();
    this._visitors = visitors ?? [];
    this._parsingState = new _ParsingGuard();
    this._moveBank = new MoveBankImpl();
  }

  /**
   * Parses for new diagnostics + update the date.
   */
  public parse(text: string): Diagnostic[] {
    this._visitors.forEach((v) => v.onParseBegin?.());

    this._tokenizer.reset();
    this._moveBank.reset();

    const diagnostics: Diagnostic[] = [];
    if (!this._isUsingControllledDate) {
      this._today = new Date();
    }

    for (const token of this._tokenizer.tokenize(text)) {
      const guardState = this._parsingState.checkEarlyReturnConditions(
        token,
        this._tokenizer
      );
      if (guardState === "hit") {
        continue;
      }

      switch (token) {
        case Token.time: {
          const section = this._parsingState.todoSections.at(-1);
          const isTimeOnSameLineAsDate =
            this._tokenizer.getLine() === section?.getTheLineDateIsOn();
          // Update existing diagnostics
          if (isTimeOnSameLineAsDate) {
            const newDate = this._getDateFromTime(this._tokenizer.getText());
            section.setDate(newDate);
            const diagnosticToAdd = section.runDiagnosticCheck();
            if (diagnosticToAdd) {
              const timeRange = this._getRangeData();
              const dateStart = section.getDateStartPosition();
              const combinedRange = new Range(
                timeRange.line,
                dateStart,
                timeRange.line,
                timeRange.lineEnd
              );
              section.setPotentialDiagnostic({
                range: combinedRange,
                message: diagnosticToAdd.message,
                severity: diagnosticToAdd.sev,
              });
            }
            continue;
          }
          this._handleDateTimeTokens(diagnostics, token);
          continue;
        }
        case Token.date: {
          this._handleDateTimeTokens(diagnostics, token);
          continue;
        }
        case Token.finishedTodoItem:
          if (this._parsingState.isParsingTodoSectionItem) {
            this._parsingState.todoSections
              .getLast()
              .addTodoItem(
                this._tokenizer.getText(),
                this._tokenizer.getLine(),
                true
              );
          }
          continue;
        case Token.todoItem:
          // We need to check if we're inside of a date section.
          if (this._parsingState.isParsingTodoSectionItem) {
            this._parsingState.todoSections
              .getLast()
              .addTodoItem(
                this._tokenizer.getText(),
                this._tokenizer.getLine(),
                false
              );
          }
          continue;
        case Token.newLine:
          if (this._parsingState.todoSections.isNotEmpty()) {
            const prevLine = this._tokenizer.getLine() - 1;
            const justFinishedParsingDate =
              prevLine ===
              this._parsingState.todoSections.getLast().getTheLineDateIsOn();
            if (justFinishedParsingDate) {
              this._visitors.forEach((v) =>
                v.onNewLineAtDate?.(
                  this._parsingState.todoSections.getLast(),
                  prevLine,
                  this._tokenizer.getPreviousLineOffset()
                )
              );
            }
          }
          continue;
        case Token.lineEnd:
          if (this._parsingState.todoSections.isNotEmpty()) {
            const thisLine = this._tokenizer.getLine();
            const justFinishedParsingDate =
              thisLine ===
              this._parsingState.todoSections.getLast().getTheLineDateIsOn();
            if (justFinishedParsingDate) {
              this._visitors.forEach((v) => {
                v.onEndLineAtDate?.(
                  this._parsingState.todoSections.getLast(),
                  thisLine,
                  this._tokenizer.getLineOffset()
                );
              });
            }
          }
          continue;
        case Token.sectionEndIdent:
          this._parsingState.isParsingTodoSectionItem = false;
          continue;
        default:
          continue;
      }
    }

    this._moveBank.validateTransfers();

    for (const section of this._parsingState.todoSections) {
      /**
       * If a section has > 1 list item, and that list item is not checked, we should highlight the date.
       */
      const shouldHighlightDate = section.containsUnfinishedItems;
      if (shouldHighlightDate) {
        // Order so that we highlight the date first.
        // This doesn't make a difference visually, but it's easier to reason about when writing tests.
        section.addDateDiagnostics(diagnostics);
        section.addTodoItemsDiagnostics(diagnostics);
      }
    }

    this._visitors.forEach((v) => v.onParseEnd?.());
    this._parsingState.reset();
    return diagnostics;
  }

  /**
   * Both date and time tokens are handled together.
   *
   * If date and time appear on the same line, a todo section will be created using the date at time,
   *
   * if the date and time appear on different lines, each time will be treated as a separate todo section of latest-seen with that time.
   *
   * If there are no previous dates before the first time, the date defaults to today.
   */
  private _handleDateTimeTokens(out: Diagnostic[], token: Token) {
    // This means that we have found a requested date to deposit the next section to.
    if (
      // cannot use insideCommentCheck because the tokenization order
      // is not guaranteed
      // this._parsingState.isInsideComment &&
      this._parsingState.moveNextSection &&
      this._parsingState.moveCommentDetail.commentLine ===
        this._tokenizer.getLine()
    ) {
      this._parsingState.moveCommentDetail.dateString =
        this._tokenizer.getText();
      return;
    }
    // Check for duplicate dates on the same line.
    if (this._parsingState.todoSections.isNotEmpty()) {
      const prevSection = this._parsingState.todoSections.getLast();
      // Allow just one date per line. Ignore the rest on the same line, if any.
      if (prevSection.getTheLineDateIsOn() === this._tokenizer.getLine()) {
        const range = this._getRange();
        out.push({
          range,
          message: "Only one date per line is allowed.",
          severity: DiagnosticSeverity.Hint,
        });
        return;
      }
    }

    // All good, add the date.
    const text = this._tokenizer.getText();
    const date =
      token === Token.date ? this._getDate(text) : this._getDateFromTime(text);

    const skip = this._parsingState.skipNextSection;
    const moved = this._parsingState.moveNextSection;
    const moveDetail = this._parsingState.moveCommentDetail;

    const newSection = new DeadlineSection({
      startPosition: this._tokenizer.getLineOffset() - text.length,
      line: this._tokenizer.getLine(),
      date: {
        instance: date,
        originalString: this._tokenizer.getText(),
      },
      skipConditions: {
        skip,
        move: moved && moveDetail ? { ...moveDetail } : false,
      },
      config: {
        now: this._today,
        settings: this._settings,
      },
    });

    const diagnosticToReport = newSection.runDiagnosticCheck();

    if (this._parsingState.moveNextSection) {
      const commentDetail = this._parsingState.moveCommentDetail;
      this._moveBank.registerTransfer({
        key: commentDetail.dateString,
        value: newSection,
      });
      this._parsingState.moveNextSection = false;
      commentDetail.reset();
      this._parsingState.skipNextSection = false;
    }

    this._moveBank.registerAccount({
      key: this._tokenizer.getText(),
      value: newSection,
    });

    this._parsingState.todoSections.push(newSection);
    this._parsingState.isParsingTodoSectionItem = true;

    if (!diagnosticToReport) {
      return;
    }

    const range = this._getRange();
    newSection.setPotentialDiagnostic({
      range,
      message: diagnosticToReport.message,
      severity: diagnosticToReport.sev,
    });
  }

  /**
   * Set time from timestring to the last section's date if exists,
   * otherwise use now from `new Date()`.
   */
  private _getDateFromTime(timeString: string): Date {
    const [hour, minute] = timeString.split(":");
    let parsedHour = Number(hour);
    let parsedMinute = Number(minute);
    if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute)) {
      parsedHour = 0;
      parsedMinute = 0;
    }

    const baseDate = this._parsingState.todoSections.isNotEmpty()
      ? this._parsingState.todoSections.at(-1)!.getDate()
      : new Date();

    const date = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      parsedHour,
      parsedMinute,
      0
    );

    return date;
  }

  private _getDate(dateString: string): Date {
    const [dd, mm, yyyy] = dateString.split("/");
    const _dd = parseInt(dd);
    const _mm = parseInt(mm);
    const _yyyy = parseInt(yyyy);
    const date = DateUtil.getDateLastMoment(_yyyy, _mm - 1, _dd, 23);
    if (!date.valueOf()) {
      // TODO throw parsing error, invalid date.
    }

    if (_dd > 31) {
      // TODO Throw invalid day
    }

    // month starts at 0
    if (_mm > 11) {
      // throw error invalid month (throw at the correct spot)
    }

    if (_yyyy < this._today.getFullYear()) {
      // throw error time traveller from the past!
    }

    return date;
  }

  /**
   *
   * @returns The range of the current `tokenizer.getText()`
   */
  private _getRange(): Range {
    const data = this._getRangeData();
    return new Range(data.line, data.startPosition, data.line, data.lineEnd);
  }

  /**
   * You can't access data from new Range from some reason, so use this instead
   */
  private _getRangeData(): {
    line: number;
    lineEnd: number;
    startPosition: number;
  } {
    return {
      line: this._tokenizer.getLine(),
      lineEnd: this._tokenizer.getLineOffset(),
      startPosition:
        this._tokenizer.getLineOffset() - this._tokenizer.getText().length,
    };
  }
}
