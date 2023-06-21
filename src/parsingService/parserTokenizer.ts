import { Range } from "vscode";

/**
 * An object that do both things at the same time.
 */
interface ParserTokenizer {
  parse: Generator<ParsedDate>;
}

interface ParsedDate {
  date: Date;
  range: Range;
}
