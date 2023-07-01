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
   *
   * Validate if a sequence of char is - [ ]
   */
  protected readonly _todoStartLineValidator: CharValidator[] = [
    (ch) => ch === CharacterCodes.dash,
    (ch) => ch === CharacterCodes.space,
    (ch) => ch === CharacterCodes.openBracket,
    (ch) =>
      [CharacterCodes.x, CharacterCodes.X, CharacterCodes.space].includes(ch),
    (ch) => ch === CharacterCodes.closeBracket,
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
      else if (this._dateValidator[0](s.charCodeAt(this._pos))) {
        const result = this._handleDate(s);
        if (result) {
          yield result;
        }
      }

      // Might be a todo item
      else if (this._todoStartLineValidator[0](s.charCodeAt(this._pos))) {
        const result = this._handleTodoItem(s);
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

    yield Token.lineEnd;
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
    let text = s[this._pos]; // first validator can be skipped
    this._pos++;
    this._lineOffset++;
    for (
      let i = 1;
      i < this._dateValidator.length;
      i++, this._pos++, this._lineOffset++
    ) {
      if (!this._dateValidator[i](s.charCodeAt(this._pos))) {
        return null;
      }

      text += s[this._pos];
    }

    this._text = text;
    return Token.date;
  }

  /**
   * @param s the string to be parsed
   * @returns Token.todoItem if the string is a todo item, null otherwise
   */
  private _handleTodoItem(s: string): Token.todoItem | null {
    let text = s[this._pos]; // skip the first character.
    this._pos++;
    this._lineOffset++;
    for (
      let i = 1;
      i < this._todoStartLineValidator.length;
      i++, this._pos++, this._lineOffset++
    ) {
      if (!this._todoStartLineValidator[i](s.charCodeAt(this._pos))) {
        return null;
      }

      text += s[this._pos];
    }

    let prevPos = this._pos;

    while (
      !this._isLineBreak(s.charCodeAt(this._pos)) &&
      this._pos < s.length
    ) {
      text += s[this._pos];
      this._pos++;
      this._lineOffset++;
    }

    // It's not a valid markdown list item if there's no text after the [x]
    if (this._pos <= prevPos) {
      return null;
    }

    this._text = text;
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
