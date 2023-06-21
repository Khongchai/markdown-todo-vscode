import { Range } from "vscode";

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
