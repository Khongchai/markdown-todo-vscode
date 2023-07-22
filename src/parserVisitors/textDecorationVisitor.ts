import { DateParsedEvent, ParserVisitor } from "../parsingService/parser";
import * as vscode from "vscode";
import DateUtil from "../parsingService/utils";

const decorationMap: Record<string, vscode.TextEditorDecorationType> = {};

function addDecoration(...args: Parameters<DateParsedEvent>) {
  const [date, line, lineEnd] = args satisfies [Date, number, number];
  const diffDays = DateUtil.getDiffInDays(date, DateUtil.getDate());

  // There can only be one date per line, so we're safe.
  if (!decorationMap[line]) {
    const decoration = vscode.window.createTextEditorDecorationType({
      after: {
        color: "#637777",
        fontStyle: "italic",
        margin: "0 0 0 3em",
        contentText:
          diffDays < 0
            ? `Days past dateline: ${Math.abs(diffDays)}`
            : `Remaining days: ${diffDays}`,
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
