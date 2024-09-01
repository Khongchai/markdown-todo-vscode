import * as vscode from "vscode";
import textDecorationVisitor from "./parserVisitors/textDecorationVisitor";
import { DiagnosticsParser } from "./parsingService/parserExecutor";

interface DiagnosticsRunner {
  update(document: vscode.TextDocument): void;
  deleteDocument(document: vscode.TextDocument): void;
}
export default class DiagnosticsRunnerImpl implements DiagnosticsRunner {
  private readonly _diagnosticsCollection: vscode.DiagnosticCollection;
  private readonly _parser: DiagnosticsParser;

  constructor(extensionName: string, context: vscode.ExtensionContext) {
    this._diagnosticsCollection =
      vscode.languages.createDiagnosticCollection(extensionName);

    context.subscriptions.push(this._diagnosticsCollection);

    this._parser = new DiagnosticsParser({
      visitors: [textDecorationVisitor],
    });
  }

  public update(document: vscode.TextDocument): void {
    // if extension is not .md, return
    if (document.languageId !== "markdown") {
      return;
    }
    this._diagnosticsCollection.set(
      document.uri,
      this._parser.parse(document.getText())
    );
  }

  public deleteDocument(document: vscode.TextDocument): void {
    this._diagnosticsCollection.delete(document.uri);
  }
}
