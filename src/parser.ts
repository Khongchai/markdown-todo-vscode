import { Diagnostic, DiagnosticSeverity, Range, TextDocument } from "vscode";
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

export interface HighlightSettings {
  errorIfLessThanDays: number;
  infoIfLessThanDays: number;
  warningIfLessThanDays: number;
  hintIfLessThanDays: number;
}

// TODO once it works, refactor parser into a sepraate entity.
export class DiagnosticsParser {
  private readonly _settings: HighlightSettings;
  private _today: Date;

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
    text: "",
  };

  constructor({
    settings,
    today,
  }: {
    settings?: HighlightSettings;
    today?: Date;
  }) {
    this._today = today ?? new Date();
    this._settings = settings ?? {
      errorIfLessThanDays: 2,
      warningIfLessThanDays: 4,
      infoIfLessThanDays: 6,
      hintIfLessThanDays: 8,
    };
  }

  parse(text: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    this._today = new Date();

    let line = 0;

    for (const token of this.tokenize(text)) {
      switch (token) {
        case Token.date:
          continue;
        case Token.newLine:
          continue;
      }
      line++;
    }

    return diagnostics;
  }

  *tokenize(s: string): Generator<Token> {
    let pos = 0;

    while (pos < s.length) {
      if (s.charCodeAt(pos) === CharacterCodes.lineFeed) {
        pos++;
        yield Token.newLine;
      }

      // validate the date.
      if (this._isDigit(s.charCodeAt(pos))) {
        pos++; // we can now skip the first validator.
        let matches = 1;
        let i = 1;
        let text = s.charAt(pos);
        while (matches !== this._tokenizerInfo.dateValidator.length) {
          if (this._isLineBreak(s.charCodeAt(pos))) {
            break;
          }

          // matches
          if (this._tokenizerInfo.dateValidator[i](s.charCodeAt(pos))) {
            matches++;
            i++;
            text += s[pos];
          } else {
            break;
          }

          pos++;
        }

        this._tokenizerInfo.text = text;
        yield Token.date;
      }

      pos++;
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
