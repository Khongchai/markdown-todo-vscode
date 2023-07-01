import { CharacterCodes } from "../constants";
import { Token } from "./types";

/**
 * TODO validators might actually be overkill and regex might just be better.
 */
type CharValidator = (ch: number) => boolean;

abstract class DeclarativeValidator {
  /**
   * For declaratively validate the date.
   *
   * TODO profile against regex, maybe it's not actually that slow.
   */
  protected readonly _dateValidator: CharValidator[] = [
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

  /**
   * TODO profile this as well.
   */
  protected readonly _todoValidator: CharValidator[] = [
    (ch) => ch === CharacterCodes.dash,
    (ch) => ch === CharacterCodes.space,
    (ch) => ch === CharacterCodes.openBrace,
    (ch) =>
      [CharacterCodes.x, CharacterCodes.X, CharacterCodes.space].includes(ch),
    (ch) => ch === CharacterCodes.closeBrace,
  ];

  protected _isDigit(ch: number): boolean {
    return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
  }

  protected _isSlash(ch: number): boolean {
    return ch === CharacterCodes.slash;
  }

  protected _isLineBreak(ch: number): boolean {
    return (
      ch === CharacterCodes.lineFeed || ch === CharacterCodes.carriageReturn
    );
  }
}

export class DiagnosticsTokenizer extends DeclarativeValidator {
  private _lineOffset: number;
  private _line: number;
  private _pos: number;
  private _text: string;

  constructor() {
    super();
    this._lineOffset = 0;
    this._line = 0;
    this._pos = 0;
    this._text = "";
  }

  public *tokenize(s: string): Generator<Token> {
    while (this._pos < s.length) {
      const code = s.charCodeAt(this._pos);
      if (this._isLineBreak(code)) {
        yield this._handleLineBreak(s);
      }

      // Might be a date
      else if (this._isDigit(s.charCodeAt(this._pos))) {
        const result = this._handleDate(s);
        if (result) {
          yield result;
        }
      }

      // Might be a todo item
      else if (s.charCodeAt(this._pos) === CharacterCodes.dash) {
        const result = this._handleDash(s);
        if (result) {
          yield result;
        }
      }

      // other
      else {
        this._pos++;
        this._lineOffset++;
      }
    }

    return Token.lineEnd;
  }

  /**
   *
   * @param s the string to be parsed
   */
  private _handleLineBreak(s: string): Token.newLine {
    const firstLineBreak = s.charCodeAt(this._pos);
    this._line++;
    this._lineOffset = 0;
    this._pos++;
    this._text = s[this._pos];

    // handle \r\n
    if (
      firstLineBreak === CharacterCodes.carriageReturn &&
      s.charCodeAt(this._pos) === CharacterCodes.lineFeed
    ) {
      this._pos++;
      this._text += "\n";
    }

    return Token.newLine;
  }

  /**
   *
   * @param s the string to be parsed
   * @returns Token.date if the string is a date, null otherwise
   */
  private _handleDate(s: string): Token.date | null {
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

    if (matches === this._dateValidator.length) {
      this._text = text;
      return Token.date;
    }

    return null;
  }

  /**
   * @param s the string to be parsed
   * @returns Token.todoItem if the string is a todo item, null otherwise
   */
  private _handleDash(s: string): Token.todoItem | null {
    for (let i = 0; i < this._todoValidator.length; i++) {
      if (!this._todoValidator[i](s.charCodeAt(this._pos + i))) {
        return null;
      }

      this._pos++;
      this._lineOffset++;
    }

    return Token.todoItem;
  }

  public reset(): void {
    this._lineOffset = 0;
    this._line = 0;
    this._pos = 0;
    this._text = "";
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
