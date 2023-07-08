import { ParserVisitor } from "../parsingService/parser";
import * as vscode from "vscode";
import DateUtil from "../parsingService/utils";

const textDecorationVisitor: ParserVisitor = {
  onNewLineAtDate: (date, line, lineEnd) => {
    const diffDate = DateUtil.getDiffInDays(new Date(), date);
    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: `Remaning days: ${diffDate}`,
      },
    });

    vscode.window.activeTextEditor?.setDecorations(decorationType, [
      new vscode.Range(line, lineEnd, line, lineEnd),
    ]);
  },
} as ParserVisitor;

export default textDecorationVisitor;
