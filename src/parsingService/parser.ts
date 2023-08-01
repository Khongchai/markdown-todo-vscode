import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import DateUtil from "./utils";
import { DiagnosticsTokenizer } from "./tokenizer";
import { DaySettings, ReportedDiagnostic, Token } from "./types";
import { DeadlineSection as DeadlineSection } from "./todoSection";
import "../protoExtensions/protoExtensions";

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
 * States of the current parser.
 */
interface _ParsingState {
  todoSections: DeadlineSection[];
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
  isParsingTodoSectionItem: boolean;
  /**
   * true if the parser is currently inside a markdown code block (three backticks).
   */
  isInsideCodeBlock: boolean;
  /**
   * true if the parser is currently inside a markdown comment (<!-- -->).
   */
  isInsideComment: boolean;
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

    const state: _ParsingState = {
      isParsingTodoSectionItem: false,
      isInsideCodeBlock: false,
      isInsideComment: false,
      todoSections: [],
    };

    for (const token of this._tokenizer.tokenize(text)) {
      if (token === Token.tripleBackTick) {
        state.isInsideCodeBlock = !state.isInsideCodeBlock;
        continue;
      }

      if (token === Token.commentStart) {
        state.isInsideComment = true;
        continue;
      }

      if (token === Token.commentEnd) {
        state.isInsideComment = false;
        continue;
      }

      if (
        (state.isInsideCodeBlock || state.isInsideComment) &&
        token !== Token.lineEnd
      ) {
        continue;
      }

      switch (token) {
        case Token.date: {
          // Check for duplicate dates on the same line.
          if (state.todoSections.isNotEmpty()) {
            const prevSection = state.todoSections.getLast();
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

          const currentSection = new DeadlineSection(
            diagnosticToReport,
            this._tokenizer.getLine(),
            date
          );

          state.todoSections.push(currentSection);
          state.isParsingTodoSectionItem = true;

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
          if (state.isParsingTodoSectionItem) {
            state.todoSections
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
          if (state.isParsingTodoSectionItem) {
            state.todoSections
              .getLast()
              .addTodoItem(
                this._tokenizer.getText(),
                this._tokenizer.getLine(),
                false
              );
          }
          continue;
        case Token.newLine:
          if (state.todoSections.isNotEmpty()) {
            const prevLine = this._tokenizer.getLine() - 1;
            const justFinishedParsingDate =
              prevLine === state.todoSections.getLast().getTheLineDateIsOn();
            if (justFinishedParsingDate) {
              this._visitors.forEach((v) =>
                v.onNewLineAtDate?.(
                  state.todoSections.getLast(),
                  prevLine,
                  this._tokenizer.getPreviousLineOffset()
                )
              );
            }
          }
          continue;
        case Token.lineEnd:
          if (state.todoSections.isNotEmpty()) {
            const thisLine = this._tokenizer.getLine();
            const justFinishedParsingDate =
              thisLine === state.todoSections.getLast().getTheLineDateIsOn();
            if (justFinishedParsingDate) {
              this._visitors.forEach((v) => {
                v.onEndLineAtDate?.(
                  state.todoSections.getLast(),
                  thisLine,
                  this._tokenizer.getLineOffset()
                );
              });
            }
          }
          continue;
        case Token.sectionEnd:
          state.isParsingTodoSectionItem = false;
          continue;
        default:
          continue;
      }
    }

    for (const section of state.todoSections) {
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
