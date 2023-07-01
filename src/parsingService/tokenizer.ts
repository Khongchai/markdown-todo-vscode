import { CharacterCodes } from "../constants";
import { Token } from "./types";

export class DiagnosticsTokenizer {
  /**
   * For declaratively validate the date.
   */
  private readonly _dateValidator = [
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
  ];

  private _lineOffset: number;
  private _line: number;
  private _pos: number;
  private _text: string;

  constructor() {
    this._lineOffset = 0;
    this._line = 0;
    this._pos = 0;
    this._text = "";
  }

  public *tokenize(s: string): Generator<Token> {
    while (this._pos < s.length) {
      const code = s.charCodeAt(this._pos);
      if (this._isLineBreak(code)) {
        this._line++;
        this._lineOffset = 0;
        this._pos++;
        this._text = s[this._pos];

        if (
          code === CharacterCodes.carriageReturn &&
          s.charCodeAt(this._pos) === CharacterCodes.lineFeed
        ) {
          this._pos++;
          this._text += "\n";
        }

        yield Token.newLine;
      }

      // validate the date.
      else if (this._isDigit(s.charCodeAt(this._pos))) {
        let text = s.charAt(this._pos); // get the first character of the date
        this._pos++;
        this._lineOffset++;
        let matches = 1;
        let i = 1;
        while (matches !== this._dateValidator.length) {
          if (this._isLineBreak(s.charCodeAt(this._pos))) {
            break;
          }

          // matches
          if (this._dateValidator[i](s.charCodeAt(this._pos))) {
            matches++;
            i++;
            text += s[this._pos];
          } else {
            // doesn't match
            break;
          }

          this._pos++;
          this._lineOffset++;
        }

        this._text = text;
        yield Token.date;
      }

      // other
      else {
        this._pos++;
        this._lineOffset++;
      }
    }

    return Token.lineEnd;
  }

  public reset(): void {
    this._lineOffset = 0;
    this._line = 0;
    this._pos = 0;
    this._text = "";
  }

  private _isDigit(ch: number): boolean {
    return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
  }

  private _isSlash(ch: number): boolean {
    return ch === CharacterCodes.slash;
  }

  private _isLineBreak(ch: number): boolean {
    return (
      ch === CharacterCodes.lineFeed || ch === CharacterCodes.carriageReturn
    );
  }

  // Getters and setters

  public getText() {
    return this._text;
  }

  public getLine() {
    return this._line;
  }

  public getLineOffset() {
    return this._lineOffset;
  }
}
