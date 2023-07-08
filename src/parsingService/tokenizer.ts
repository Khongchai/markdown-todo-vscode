import { CharacterCodes } from "./constants";
import { Token } from "./types";
import { DeclarativeValidator } from "./validator";

type Cursor = {
  line: number;
  lineOffset: number;
  pos: number;
};

export class DiagnosticsTokenizer extends DeclarativeValidator {
  private _text: string;
  private _previousCursor: Cursor;
  private _cursor: Cursor;

  constructor() {
    super();
    this._text = "";
    this._cursor = {
      line: 0,
      lineOffset: 0,
      pos: 0,
    };
    this._previousCursor = {
      line: -1,
      lineOffset: -1,
      pos: 0,
    };
  }

  public *tokenize(s: string): Generator<Token> {
    while (this._cursor.pos < s.length) {
      const code = s.charCodeAt(this._cursor.pos);
      if (this._isLineBreak(code)) {
        yield this._handleLineBreak(s);
      }

      // Might be a date
      else if (this._dateValidator[0](s.charCodeAt(this._cursor.pos))) {
        const result = this._handleDate(s);
        if (result) {
          yield result;
        }
      }

      // Might be a todo item
      else if (
        this._todoStartLineValidator[0](s.charCodeAt(this._cursor.pos))
      ) {
        const result = this._handleTodoItem(s);
        if (result) {
          yield result;
        }
      }

      // Are we closing off a section?
      else if (
        this._markdownCommentStartValidator[0](s.charCodeAt(this._cursor.pos))
      ) {
        const result = this._handleSectionEnd(s);
        if (result) {
          yield result;
        }
      }

      // other
      else {
        this._cursor.pos++;
        this._cursor.lineOffset++;
      }
    }

    yield Token.lineEnd;
  }

  /**
   *
   * @param s the string to be parsed
   */
  private _handleLineBreak(s: string): Token.newLine {
    const firstLineBreak = s.charCodeAt(this._cursor.pos);
    this._previousCursor.line = this._cursor.line;
    this._previousCursor.lineOffset = this._cursor.lineOffset;

    this._cursor.line++;
    this._cursor.lineOffset = 0;
    this._cursor.pos++;
    this._text = s[this._cursor.pos];

    // handle \r\n
    if (
      firstLineBreak === CharacterCodes.carriageReturn &&
      s.charCodeAt(this._cursor.pos) === CharacterCodes.lineFeed
    ) {
      this._cursor.pos++;
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
    let text = s[this._cursor.pos]; // first validator can be skipped
    this._cursor.pos++;
    this._cursor.lineOffset++;
    for (
      let i = 1;
      i < this._dateValidator.length;
      i++, this._cursor.pos++, this._cursor.lineOffset++
    ) {
      if (!this._dateValidator[i](s.charCodeAt(this._cursor.pos))) {
        return null;
      }

      text += s[this._cursor.pos];
    }

    this._text = text;
    return Token.date;
  }

  /**
   * @param s the string to be parsed
   * @returns Token.todoItem if the string is a todo item, null otherwise
   */
  private _handleTodoItem(s: string): Token.todoItem | null {
    let text = s[this._cursor.pos]; // skip the first character.
    this._cursor.pos++;
    this._cursor.lineOffset++;
    for (
      let i = 1;
      i < this._todoStartLineValidator.length;
      i++, this._cursor.pos++, this._cursor.lineOffset++
    ) {
      if (!this._todoStartLineValidator[i](s.charCodeAt(this._cursor.pos))) {
        return null;
      }

      text += s[this._cursor.pos];
    }

    let prevPos = this._cursor.pos;
    this._forwardCursorToNewLine(s, (c) => {
      text += c;
    });
    // It's not a valid markdown list item if there's no text after the [x]
    if (this._cursor.pos <= prevPos) {
      return null;
    }

    this._text = text;
    return Token.todoItem;
  }

  /**
   *
   * @param s the string to be parsed
   * @returns Token.sectionEnd if the string is a section end, null otherwise
   */
  private _handleSectionEnd(s: string): Token.sectionEnd | null {
    let text = s[this._cursor.pos];
    this._cursor.pos++;
    this._cursor.lineOffset++;

    // TODO refactor for less copy-and-pasting
    for (
      let i = 1;
      i < this._markdownCommentStartValidator.length;
      i++, this._cursor.pos++, this._cursor.lineOffset++
    ) {
      if (
        !this._markdownCommentStartValidator[i](s.charCodeAt(this._cursor.pos))
      ) {
        return null;
      }

      text += s[this._cursor.pos];
    }

    for (
      let i = 0;
      i < this._endSectionText.length;
      i++, this._cursor.pos++, this._cursor.lineOffset++
    ) {
      if (this._endSectionText[i] !== s[this._cursor.pos]) {
        return null;
      }

      text += s[this._cursor.pos];
    }

    for (
      let i = 0;
      i < this._markdownCommentEndValidator.length;
      i++, this._cursor.pos++, this._cursor.lineOffset++
    ) {
      if (
        !this._markdownCommentEndValidator[i](s.charCodeAt(this._cursor.pos))
      ) {
        return null;
      }

      text += s[this._cursor.pos];
    }

    this._text = text;
    return Token.sectionEnd;
  }

  /**
   *
   * Will consume all characters until a new line is found.
   *
   * @param s the string to be parsed
   * @param onNext called on each character until a new line is found
   */
  private _forwardCursorToNewLine(
    s: string,
    onNext?: (c: string) => void
  ): void {
    while (
      !this._isLineBreak(s.charCodeAt(this._cursor.pos)) &&
      this._cursor.pos < s.length
    ) {
      onNext?.(s[this._cursor.pos]);
      this._cursor.pos++;
      this._cursor.lineOffset++;
    }
  }

  public reset(): void {
    this._cursor.lineOffset = 0;
    this._cursor.line = 0;
    this._cursor.pos = 0;
    this._text = "";
  }

  // Getters and setters

  public getText() {
    return this._text;
  }

  public getLine() {
    return this._cursor.line;
  }

  public getLineOffset() {
    return this._cursor.lineOffset;
  }

  public getPreviousLine() {
    return this._previousCursor.line;
  }

  public getPreviousLineOffset() {
    return this._previousCursor.lineOffset;
  }
}
