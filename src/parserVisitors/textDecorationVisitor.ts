import { DateParsedEvent, ParserVisitor } from "../parsingService/parser";
import * as vscode from "vscode";
import DateUtil from "../parsingService/utils";

const decorationMap: Record<string, vscode.TextEditorDecorationType> = {};

function addDecoration(...args: Parameters<DateParsedEvent>) {
  const [date, line, lineEnd] = args satisfies [Date, number, number];
  const diffDate = DateUtil.getDiffInDays(date, new Date());

  // There can only be one date per line, so we're safe.
  if (!decorationMap[line]) {
    const isPastDateline = diffDate < 0;
    const decoration = vscode.window.createTextEditorDecorationType({
      after: {
        color: isPastDateline ? "#ff6961d9" : "#77dd77a9",
        fontStyle: "italic",
        margin: "0 0 0 3em",
        contentText: isPastDateline
          ? `Days past dateline: ${Math.abs(diffDate)}`
          : `Remaining days: ${diffDate}`,
      },
    });
    decorationMap[line] = decoration;
  }

  vscode.window.activeTextEditor?.setDecorations(decorationMap[line], [
    new vscode.Range(line, lineEnd, line, lineEnd),
  ]);
}

const textDecorationVisitor: ParserVisitor = {
  onNewLineAtDate: addDecoration,
  onEndLineAtDate: addDecoration,
  onParseBegin: () => {
    Object.keys(decorationMap).forEach((key) => {
      decorationMap[key].dispose();
      delete decorationMap[key];
    });
  },
} as ParserVisitor;

export default textDecorationVisitor;
