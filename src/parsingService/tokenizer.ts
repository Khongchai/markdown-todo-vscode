import { CharacterCodes } from "./constants";
import { Token } from "./types";
import { DeclarativeValidator } from "./validator";

type Cursor = {
  line: number;
  lineOffset: number;
  pos: number;
};

/**
 * Don't judge me, mmk? I know this tokenizer is doing too much..
 */
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
        continue;
      }

      // Is it a date or time? Date is xx/xx/xx, time is xx:xx
      if (this._dateValidator[0](s.charCodeAt(this._cursor.pos))) {
        const result = this._handleDateOrTime(s);
        if (result) {
          yield result;
        }
        continue;
      }

      // Might be a todo item
      if (this._todoValidators.start[0](s.charCodeAt(this._cursor.pos))) {
        const result = this._handleTodoItem(s);
        if (result) {
          yield result;
        }
        continue;
      }

      // Are we closing off a section or is it just a comment?
      if (
        this._markdownCommentStartValidator[0](s.charCodeAt(this._cursor.pos))
      ) {
        const commentStartToken = this._handleCommentStart(s);
        if (commentStartToken) {
          yield commentStartToken;

          if (this._cursor.pos < s.length) {
            yield* this._handleCommentEnd(s);
          }
        }
        continue;
      }

      // Markdown code block begin/end (triple backticks)
      if (this._codeblockValidator[0](s.charCodeAt(this._cursor.pos))) {
        const result = this._handleCodeBlock(s);
        if (result) {
          yield result;
        }
        continue;
      }

      // other
      else {
        this._cursor.pos++;
        this._cursor.lineOffset++;
        continue;
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

  private _handleDateOrTime(s: string): Token.time | Token.date | null {
    const slashPos = 2;
    const colonPos = 3;
    const possibleSlash = s.charCodeAt(this._cursor.pos + slashPos);
    const possibleColon = s.charCodeAt(this._cursor.pos + colonPos);
    if (possibleColon === CharacterCodes.colon) {
      const text = this._useValidator(s, this._timeValidator);
      if (text) {
        this._text = text;
        return Token.time;
      }
      return null;
    } else if (possibleSlash === CharacterCodes.slash) {
      const text = this._useValidator(s, this._dateValidator);
      if (text) {
        this._text = text;
        return Token.date;
      }
      return null;
    }

    const nextIsLineBreak = this._isLineBreak(
      s.charCodeAt(this._cursor.pos + 1)
    );
    if (nextIsLineBreak) {
      this._cursor.pos++;
      this._cursor.lineOffset++;
      return null;
    }

    const forward = Math.min(slashPos, colonPos);
    this._cursor.pos += forward;
    this._cursor.lineOffset += forward;
    return null;
  }

  /**
   * @param s the string to be parsed
   * @returns Token.todoItem if the string is a todo item, null otherwise
   */
  private _handleTodoItem(
    s: string
  ): Token.todoItem | Token.finishedTodoItem | null {
    let token: Token.todoItem | Token.finishedTodoItem;

    const { start, checkMark, end } = this._todoValidators;
    let text = this._useValidator(s, start);
    if (!text) return null;

    if (checkMark(s.charCodeAt(this._cursor.pos))) {
      token = Token.finishedTodoItem;
      text += s[this._cursor.pos];
      this._cursor.pos++;
      this._cursor.lineOffset++;
    } else if (CharacterCodes.space === s.charCodeAt(this._cursor.pos)) {
      token = Token.todoItem;
      text += s[this._cursor.pos];
      this._cursor.pos++;
      this._cursor.lineOffset++;
    } else {
      return null;
    }

    const endResult = this._useValidator(s, end, 0, 0);
    if (!endResult) return null;
    text += endResult;

    const prevPos = this._cursor.pos;
    this._forwardCursorToNewLine(s, (c) => {
      text += c;
    });
    // It's not a valid markdown list item if there's no text after the [x] | [ ]
    if (this._cursor.pos <= prevPos) {
      return null;
    }

    this._text = text;
    return token;
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

  /**
   * Returns a sequence of tokens within that comment.
   *
   */
  private *_handleCommentEnd(s: string): Generator<Token> {
    let commentString = s[this._cursor.pos];
    let endCommentCount = 0;

    // Keep going until we reach the end of the line.
    // Markdown comment end can be on a different line, but for simplicity's sake, if
    // it's not found within the same line, we just break early with `!this._isLineBreak`
    while (
      s.length > this._cursor.pos &&
      !this._isLineBreak(s.charCodeAt(this._cursor.pos))
    ) {
      if (
        this._markdownCommentEndValidator[0](s.charCodeAt(this._cursor.pos))
      ) {
        const result = this._useValidator(s, this._markdownCommentEndValidator);
        if (!result) continue;

        this._text = "-->";
        yield Token.commentEnd;
        endCommentCount++;
        continue;
      }

      this._cursor.pos++;
      this._cursor.lineOffset++;
      commentString += s[this._cursor.pos];
    }

    const validEnd = endCommentCount === 1;
    if (!validEnd) return;

    // last trailing character in a comment string is the first character in the end comment.
    const commentContent = commentString.substring(0, commentString.length - 1);

    if (commentContent === this._identsValidator.skip) {
      this._text = commentContent;
      yield Token.skipIdent;
      return;
    } else if (commentContent === this._identsValidator.endSection) {
      this._text = commentContent;
      yield Token.sectionEndIdent;
      return;
    }

    // validate if the following is `moved xx/xx/xxxx`
    let cur = 0;
    let moved = "";
    for (let i = 0; i < this._identsValidator.moved.length; i++) {
      if (!this._identsValidator.moved[i](commentContent.charCodeAt(i))) {
        return;
      }

      moved += commentContent[i];
      cur++;
    }

    if (moved !== " moved ") return;
    this._text = " moved ";
    yield Token.movedIdent;

    let date = "";
    for (let i = 0; i < this._dateValidator.length; i++, cur++) {
      if (!this._dateValidator[i](commentContent.charCodeAt(cur))) {
        return;
      }
      date += commentContent[cur];
    }

    this._text = date;
    yield Token.date;
  }

  /**
   * Use the validator to validate a given string.
   *
   * Forward cursor position for every validator used up.
   *
   * If all validators are used up, the current cursor position will be the next character after the validated pattern.
   *
   * @param s the string to parse
   * @param validator the validator functions to call
   * @param cursorStartsAt the position the cursor should start at. 0 means where the cursor currently is.
   * @param validatorStartsAt  the position in the array the validator should start at. 0 means the beginning of the validator array is used and the subsequent ones are used in the next iterations.
   *
   * @returns validated string or null if the validation fails
   */
  private _useValidator(
    s: string,
    validator: ((c: number) => boolean)[],
    cursorStartsAt = 1,
    validatorStartsAt = 1
  ): string | null {
    let text = "";
    if (cursorStartsAt > 0) {
      text = s[this._cursor.pos];
      this._cursor.pos += cursorStartsAt;
      this._cursor.lineOffset += cursorStartsAt;
    }

    for (
      let i = validatorStartsAt;
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
