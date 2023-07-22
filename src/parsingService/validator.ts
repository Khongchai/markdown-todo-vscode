import { CharacterCodes } from "./constants";

/**
 * TODO validators might actually be overkill and regex might just be better.
 */
type CharValidator = (ch: number) => boolean;

export abstract class DeclarativeValidator {
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
    (ch) => this._isDash(ch) || ch === CharacterCodes.plus,
    (ch) => ch === CharacterCodes.space,
    (ch) => ch === CharacterCodes.openBracket,
    (ch) =>
      [CharacterCodes.x, CharacterCodes.X, CharacterCodes.space].includes(ch),
    (ch) => ch === CharacterCodes.closeBracket,
    (ch) => ch === CharacterCodes.space,
  ];

  protected readonly _markdownCommentStartValidator: CharValidator[] = [
    (ch) => ch === CharacterCodes.lessThan,
    (ch) => ch === CharacterCodes.exclamationMark,
    this._isDash,
    this._isDash,
  ];

  protected readonly _codeblockValidator: CharValidator[] = [
    (ch) => ch === CharacterCodes.backtick,
    (ch) => ch === CharacterCodes.backtick,
    (ch) => ch === CharacterCodes.backtick,
  ];

  protected readonly _endSectionText = " end section ";

  protected readonly _markdownCommentEndValidator: CharValidator[] = [
    this._isDash,
    this._isDash,
    (ch) => ch === CharacterCodes.greaterThan,
  ];

  protected _isBacktick(ch: number): boolean {
    return ch === CharacterCodes.backtick;
  }

  protected _isDash(ch: number): boolean {
    return ch === CharacterCodes.dash;
  }

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
