import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import DateUtil from "./utils";
import { DiagnosticsTokenizer } from "./tokenizer";
import { DaySettings, ReportedDiagnostic, Token } from "./types";
import { TODOSection } from "./todoSection";
import "../protoExtensions/protoExtensions";

export interface ParserVisitor {
  onNewLineAtDate(date: Date, line: number, lineEnd: number): void;
}

/**
 * States of the current parser.
 */
interface _ParsingState {
  todoSections: TODOSection[];
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
    this._tokenizer.reset();

    const diagnostics: Diagnostic[] = [];
    if (!this._isUsingControllledDate) {
      this._today = DateUtil.getDate();
    }

    const state: _ParsingState = {
      isParsingTodoSectionItem: false,
      todoSections: [],
    };

    for (const token of this._tokenizer.tokenize(text)) {
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

          const currentSection = new TODOSection(
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
          diagnostics.push({
            range,
            message: diagnosticToReport.message,
            severity: diagnosticToReport.sev,
          });

          continue;
        }
        case Token.todoItem:
          // We need to check if we're inside of a date section.
          if (
            // TODO @khongchai this condition is not needed...(maybe, check again)
            state.todoSections.isNotEmpty() &&
            state.isParsingTodoSectionItem
          ) {
            state.todoSections
              .getLast()
              .addTodoItem(
                this._tokenizer.getText(),
                this._tokenizer.getLine()
              );
          }
          continue;
        case Token.newLine:
        case Token.lineEnd:
          // If we're parsing, that means we're inside of a date section.
          if (state.todoSections.isNotEmpty()) {
            const prevLine = this._tokenizer.getLine() - 1;
            const justFinishedParsingDate =
              prevLine === state.todoSections.getLast().getTheLineDateIsOn();
            if (justFinishedParsingDate) {
              this._visitors.forEach((v) =>
                v.onNewLineAtDate(
                  state.todoSections.getLast().getDate(),
                  prevLine,
                  this._tokenizer.getPreviousLineOffset()
                )
              );
            }
          }
          continue;
        case Token.sectionEnd:
          state.isParsingTodoSectionItem = false;
      }
    }

    for (const section of state.todoSections) {
      section.addTodoItemsDiagnostics(diagnostics);
    }

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
        message: `Deadline is only like ${diffDays} days away!`,
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
