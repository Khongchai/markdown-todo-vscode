import * as vscode from "vscode";
import DateUtil from "../parsingService/dateUtils";
import {
  DateParsedEvent,
  ParserVisitor,
} from "../parsingService/parserExecutor";
import { DeadlineSection } from "../parsingService/todoSection";

const decorationMap: Record<string, vscode.TextEditorDecorationType> = {};

function addDecoration(...args: Parameters<DateParsedEvent>) {
  // A quick hack to make sure that the decorations are applied after the section is updated.
  // There are many other more elegant solutions, but this works and I'm tired, it's getting late.
  queueMicrotask(() => {
    const [section, line, lineEnd] = args satisfies [
      DeadlineSection,
      number,
      number
    ];

    // There can only be one date per line, so we're safe.
    if (!decorationMap[line]) {
      const decoration = vscode.window.createTextEditorDecorationType({
        after: {
          color: "#637777",
          fontStyle: "italic",
          margin: "0 0 0 3em",
          contentText: (() => {
            if (section.getOrigin() === "time") return;
            const isToday = DateUtil.isToday(section.getDate());
            let dayName = isToday ? "Today " : "";
            dayName += `(${section
              .getDate()
              .toLocaleDateString("en-US", { weekday: "long" })}) `;
            if (!section.hasItems) {
              if (section.isRegisteredForExtraction()) {
                return dayName + "All items moved";
              }
              return dayName;
            }
            if (!section.containsUnfinishedItems) return dayName + "Done";
            return dayName;
          })(),
        },
      });
      decorationMap[line] = decoration;
    }

    vscode.window.activeTextEditor?.setDecorations(decorationMap[line], [
      new vscode.Range(line, lineEnd, line, lineEnd),
    ]);
  });
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
