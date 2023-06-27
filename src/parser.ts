import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { CharacterCodes } from "./constants";

export interface TODOSection {
  date: ParsedDate;
  items: ParsedTodo[];
}

export interface ParsedDate {
  date: Date;
  range: Range;
}

export interface ParsedTodo {
  range: Range;
}

export const enum Token {
  newLine,
  date,
  lineEnd,
}

export interface DaySettings {
  critical: number;
  deadlineApproaching: number;
  shouldProbablyBeginWorkingOnThis: number;
}

// TODO once it works, refactor parser into a sepraate entity.
export class DiagnosticsParser {
  private readonly _settings: DaySettings;
  private _today: Date;
  private _isUsingControllledDate: boolean;

  /**
   * Temp object so that we can refactor tokenizer out easier.
   */
  private readonly _tokenizerInfo = {
    dateValidator: [
      this._isDigit,
      this._isDigit,
      this._isSlash,
      this._isDigit,
      this._isDigit,
      this._isSlash,
      this._isDigit,
      this._isDigit,
      this._isDigit,
      this._isDigit,
    ],
    dateStringLength: "xx/xx/xxxx".length,
    lineStartOffset: 0,
    line: 0,
    pos: 0,
    text: "",
  };

  constructor({
    daySettings: settings,
    today,
  }: {
    daySettings?: DaySettings;
    today?: Date;
  }) {
    this._today = today ?? new Date();
    this._isUsingControllledDate = !!today;
    this._settings = settings ?? {
      critical: 2,
      deadlineApproaching: 4,
      shouldProbablyBeginWorkingOnThis: 7,
    };
  }

  /**
   * Parses for new diagnostics + update the date.
   */
  parse(text: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (!this._isUsingControllledDate) {
      this._today = new Date();
    }

    let line = -1; // should this be a part of the tokenizer or the parser?

    for (const token of this.tokenize(text)) {
      switch (token) {
        case Token.date:
          const date = this._getDate(this._tokenizerInfo.text);
          const diagnostic = this._checkDiagnosticSeverity(date);
          if (diagnostic) {
            diagnostics.push({
              message: diagnostic.message,
              severity: diagnostic.sev,
              // date string should always end on one line.
              range: new Range(
                line,
                this._tokenizerInfo.pos - this._tokenizerInfo.lineStartOffset,
                line,
                this._tokenizerInfo.text.length
              ),
            });
          }
          continue;
        case Token.newLine:
        case Token.lineEnd:
          continue;
      }
    }

    return diagnostics;
  }

  private _getDate(dateString: string): Date {
    const [dd, mm, yyyy] = dateString.split("/");
    const _dd = parseInt(dd);
    const _mm = parseInt(mm);
    const _yyyy = parseInt(yyyy);
    const date = new Date(_yyyy, _mm, _dd);
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

  private _checkDiagnosticSeverity(
    date: Date
  ): { sev: DiagnosticSeverity; message: string } | null {
    const diff = this._today.getTime() - date.getTime();
    const diffDays = diff / 1000 / 60 / 60 / 24;
    const { critical, deadlineApproaching, shouldProbablyBeginWorkingOnThis } =
      this._settings;
    if (diffDays < 0) {
      return {
        sev: DiagnosticSeverity.Error,
        message: "This is overdue!",
      };
    }
    if (diffDays < critical) {
      return {
        sev: DiagnosticSeverity.Warning,
        message: "Today's the deadline!",
      };
    }
    if (diffDays < deadlineApproaching) {
      return {
        sev: DiagnosticSeverity.Information,
        message: "The deadline is approaching.",
      };
    }
    if (diffDays < shouldProbablyBeginWorkingOnThis) {
      return {
        sev: DiagnosticSeverity.Hint,
        message: "If you haven't already, start working on this.",
      };
    }

    return null;
  }

  *tokenize(s: string): Generator<Token> {
    while (this._tokenizerInfo.pos < s.length) {
      if (s.charCodeAt(this._tokenizerInfo.pos) === CharacterCodes.lineFeed) {
        this._tokenizerInfo.line++;
        this._tokenizerInfo.lineStartOffset = this._tokenizerInfo.pos;
        this._tokenizerInfo.pos++;
        yield Token.newLine;
      }

      // validate the date.
      if (this._isDigit(s.charCodeAt(this._tokenizerInfo.pos))) {
        let matches = 1;
        let i = 1;
        let text = s.charAt(this._tokenizerInfo.pos++);
        while (matches !== this._tokenizerInfo.dateValidator.length) {
          if (this._isLineBreak(s.charCodeAt(this._tokenizerInfo.pos))) {
            break;
          }

          // matches
          if (
            this._tokenizerInfo.dateValidator[i](
              s.charCodeAt(this._tokenizerInfo.pos)
            )
          ) {
            matches++;
            i++;
            text += s[this._tokenizerInfo.pos];
          } else {
            break;
          }

          this._tokenizerInfo.pos++;
        }

        this._tokenizerInfo.text = text;
        yield Token.date;
      }

      this._tokenizerInfo.pos++;
    }

    return Token.lineEnd;
  }

  _isDigit(ch: number): boolean {
    return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
  }

  _isSlash(ch: number): boolean {
    return ch === CharacterCodes.slash;
  }

  _isLineBreak(ch: number): boolean {
    return (
      ch === CharacterCodes.lineFeed || ch === CharacterCodes.carriageReturn
    );
  }
}
