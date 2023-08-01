import { CharacterCodes } from "./constants";

/**
 * TODO validators might actually be overkill and regex might just be better.
 */
type CharValidator = (ch: number) => boolean;

export abstract class DeclarativeValidator {
  private static _validatorFromText(text: string): CharValidator[] {
    return text.split("").map(
      (validatorChar) =>
        function (ch: number): boolean {
          return ch === validatorChar.charCodeAt(0);
        }
    );
  }
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

  protected readonly _todoValidators: {
    start: CharValidator[];
    checkMark: CharValidator;
    end: CharValidator[];
  } = {
    start: [
      (ch) => ch === CharacterCodes.dash || ch === CharacterCodes.plus,
      (ch) => ch === CharacterCodes.space,
      (ch) => ch === CharacterCodes.openBracket,
    ],
    checkMark: (ch) => ch === CharacterCodes.x || ch === CharacterCodes.X,
    end: [
      (ch) => ch === CharacterCodes.closeBracket,
      (ch) => ch === CharacterCodes.space,
    ],
  };

  protected readonly _codeblockValidator: CharValidator[] =
    DeclarativeValidator._validatorFromText("```");

  protected readonly _markdownCommentStartValidator: CharValidator[] =
    DeclarativeValidator._validatorFromText("<!--");

  protected readonly _markdownCommentEndValidator: CharValidator[] =
    DeclarativeValidator._validatorFromText("-->");

  protected readonly _sectionEndText = " end section ";

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
