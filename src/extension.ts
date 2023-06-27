import * as vscode from "vscode";
import { createDiagnosticsRunner } from "./diagnosticsRunner";

export function activate(context: vscode.ExtensionContext) {
  const diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "markdown-productivity-extension"
  );
  context.subscriptions.push(diagnosticsCollection);

  const diagnosticsRunner = createDiagnosticsRunner(diagnosticsCollection);

  context.subscriptions.push(
    // TODO update only changes in the future?
    vscode.workspace.onDidChangeTextDocument((e) =>
      diagnosticsRunner.update(e.document)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((e) =>
      diagnosticsRunner.deleteDocument(e)
    )
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      (editor) => editor && diagnosticsRunner.update(editor.document)
    )
  );

  // Call update once on start to scan the text document.
  if (vscode.window.activeTextEditor) {
    diagnosticsRunner.update(vscode.window.activeTextEditor.document);
  }
}
