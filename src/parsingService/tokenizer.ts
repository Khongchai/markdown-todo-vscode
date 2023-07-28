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

      // Are we closing off a section or is it just a comment?
      else if (
        this._markdownCommentStartValidator[0](s.charCodeAt(this._cursor.pos))
      ) {
        const commentStartToken = this._handleCommentStart(s);
        if (commentStartToken) {
          yield commentStartToken;

          if (this._cursor.pos < s.length) {
            const [commentEndToken, sectionEndToken] =
              this._handleCommentEnd(s);
            if (commentEndToken && sectionEndToken) {
              yield commentEndToken;
              yield sectionEndToken;
            } else if (commentEndToken) {
              yield commentEndToken;
            }
          }
        }
      }

      // Markdown code block begin/end (triple backticks)
      else if (this._codeblockValidator[0](s.charCodeAt(this._cursor.pos))) {
        const result = this._handleCodeBlock(s);
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
    const text = this._useValidator(s, this._dateValidator);
    if (!text) return null;
    this._text = text;
    return Token.date;
  }

  /**
   * @param s the string to be parsed
   * @returns Token.todoItem if the string is a todo item, null otherwise
   */
  private _handleTodoItem(s: string): Token.todoItem | null {
    let text = this._useValidator(s, this._todoStartLineValidator);
    if (!text) return null;

    const prevPos = this._cursor.pos;
    this._forwardCursorToNewLine(s, (c) => {
      text += c;
    });
    // It's not a valid markdown list item if there's no text after the [x] | [ ]
    if (this._cursor.pos <= prevPos) {
      return null;
    }

    this._text = text;
    return Token.todoItem;
  }

  private _handleCodeBlock(s: string): Token.tripleBackTick | null {
    const result = this._useValidator(s, this._codeblockValidator);
    if (!result) return null;
    this._text = result;
    return Token.tripleBackTick;
  }

  private _handleCommentStart(s: string): Token.commentStart | null {
    const result = this._useValidator(s, this._markdownCommentStartValidator);
    if (!result) return null;
    this._text = result;
    return Token.commentStart;
  }

  private _handleCommentEnd(
    s: string
  ): [Token.commentEnd | null, Token.sectionEnd | null] {
    let commentText = s[this._cursor.pos];

    while (
      s.length > this._cursor.pos &&
      !this._isLineBreak(s.charCodeAt(this._cursor.pos))
    ) {
      if (
        this._markdownCommentEndValidator[0](s.charCodeAt(this._cursor.pos))
      ) {
        const result = this._useValidator(s, this._markdownCommentEndValidator);
        if (!result) continue;

        // remove last char because last char is the end comment marker.
        const isSectionEndMarker =
          commentText.substring(0, commentText.length - 1) ===
          this._sectionEndText;
        return isSectionEndMarker
          ? [Token.commentEnd, Token.sectionEnd]
          : [Token.commentEnd, null];
      }

      this._cursor.pos++;
      this._cursor.lineOffset++;
      commentText += s[this._cursor.pos];
    }

    return [null, null];
  }

  /**
   * Use the validator to validate a given string.
   *
   * Forward cursor position for every validator used up.
   *
   * @returns validated string or null if the validation fails
   */
  private _useValidator(
    s: string,
    validator: ((c: number) => boolean)[]
  ): string | null {
    let text = s[this._cursor.pos]; // skip the first character.
    this._cursor.pos++;
    this._cursor.lineOffset++;

    for (
      let i = 1;
      i < validator.length;
      i++, this._cursor.pos++, this._cursor.lineOffset++
    ) {
      if (!validator[i](s.charCodeAt(this._cursor.pos))) {
        return null;
      }

      text += s[this._cursor.pos];
    }

    return text;
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
