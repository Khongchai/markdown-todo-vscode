import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import DateUtil from "./utils";
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
   * check guard conditions.
   */
  public checkGuardAndUpdateState(
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

  constructor({
    daySettings: settings,
    today,
    visitors,
  }: {
    daySettings?: DaySettings;
    today?: Date;
    visitors?: ParserVisitor[];
  }) {
    this._today = today ?? DateUtil.getDate();
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
  parse(text: string): Diagnostic[] {
    this._visitors.forEach((v) => v.onParseBegin?.());

    this._tokenizer.reset();

    const diagnostics: Diagnostic[] = [];
    if (!this._isUsingControllledDate) {
      this._today = DateUtil.getDate();
    }

    for (const token of this._tokenizer.tokenize(text)) {
      const guardState = this._parsingState.checkGuardAndUpdateState(
        token,
        this._tokenizer
      );
      if (guardState === "hit") {
        continue;
      }

      switch (token) {
        case Token.date: {
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
            continue;
          }
          // Check for duplicate dates on the same line.
          if (this._parsingState.todoSections.isNotEmpty()) {
            const prevSection = this._parsingState.todoSections.getLast();
            // Allow just one date per line. Ignore the rest on the same line, if any.
            if (
              prevSection.getTheLineDateIsOn() === this._tokenizer.getLine()
            ) {
              const range = this._getRange();
              diagnostics.push({
                range,
                message: "Only one date per line is allowed.",
                severity: DiagnosticSeverity.Hint,
              });
              continue;
            }
          }

          // All good, add the date.
          const date = this._getDate(this._tokenizer.getText());
          const diagnosticToReport = this._checkDiagnosticSeverity(date);

          const skip = this._parsingState.skipNextSection;
          const moved = this._parsingState.moveNextSection;
          const moveDetail = this._parsingState.moveCommentDetail;

          const currentSection = new DeadlineSection({
            sectionDiagnostics: diagnosticToReport,
            line: this._tokenizer.getLine(),
            date,
            meta: {
              skip,
              move: moved && moveDetail ? { ...moveDetail } : false,
            },
          });

          if (this._parsingState.moveNextSection) {
            this._moveBank.registerTransfer({
              key: this._parsingState.moveCommentDetail.dateString,
              value: currentSection,
            });
            this._parsingState.moveNextSection = false;
            this._parsingState.moveCommentDetail.reset();
            this._parsingState.skipNextSection = false;
          } else {
            this._moveBank.registerAccount({
              key: this._tokenizer.getText(),
              value: currentSection,
            });
          }

          this._parsingState.todoSections.push(currentSection);
          this._parsingState.isParsingTodoSectionItem = true;

          if (!diagnosticToReport) {
            continue;
          }

          const range = this._getRange();
          currentSection.addPotentialDiagnostics({
            range,
            message: diagnosticToReport.message,
            severity: diagnosticToReport.sev,
          });

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

    this._moveBank.applyTransfers();

    for (const section of this._parsingState.todoSections) {
      /**
       * If a section has > 1 list item, and that list item is not checked, we should highlight the date.
       */
      const shouldHighlightDate = section.containsUnfinishedItems;
      if (shouldHighlightDate) {
        // Order so that we highlight the date first.
        // This doesn't make a difference vissually, but it's easier to reason about when writing tests.
        section.addDateDiagnostics(diagnostics);
        section.addTodoItemsDiagnostics(diagnostics);
      }
    }

    this._visitors.forEach((v) => v.onParseEnd?.());
    this._parsingState.reset();
    return diagnostics;
  }

  private _getDate(dateString: string): Date {
    const [dd, mm, yyyy] = dateString.split("/");
    const _dd = parseInt(dd);
    const _mm = parseInt(mm);
    const _yyyy = parseInt(yyyy);
    const date = DateUtil.getDateLikeNormalPeople(_yyyy, _mm, _dd);
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

  private _checkDiagnosticSeverity(date: Date): ReportedDiagnostic | null {
    const diffDays = DateUtil.getDiffInDays(date, this._today);
    const { critical, deadlineApproaching } = this._settings;
    if (diffDays < 0) {
      return {
        sev: DiagnosticSeverity.Error,
        message: "This is overdue!",
      };
    }
    if (diffDays < critical) {
      return {
        sev: DiagnosticSeverity.Warning,
        message: `You should do this soon!`,
      };
    }
    if (diffDays < deadlineApproaching) {
      return {
        sev: DiagnosticSeverity.Information,
        message: "The deadline is approaching.",
      };
    }

    return null;
  }

  /**
   *
   * @returns The range of the current `tokenizer.getText()`
   */
  private _getRange(): Range {
    return new Range(
      this._tokenizer.getLine(),
      this._tokenizer.getLineOffset() - this._tokenizer.getText().length,
      this._tokenizer.getLine(),
      this._tokenizer.getLineOffset()
    );
  }
}
