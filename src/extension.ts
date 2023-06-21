import * as vscode from "vscode";
import { createDiagnosticsRunner } from "./diagnosticsRunner";

export function activate(context: vscode.ExtensionContext) {
  const diagnosticsCollection = vscode.languages.createDiagnosticCollection(
    "markdown-productivity-extension"
  );
  context.subscriptions.push(diagnosticsCollection);

  const diagnosticsRuner = createDiagnosticsRunner(diagnosticsCollection);

  context.subscriptions.push(
    // TODO update only changes in the future?
    vscode.workspace.onDidChangeTextDocument((e) =>
      diagnosticsRuner.update(e.document)
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((e) =>
      diagnosticsRuner.deleteDocument(e)
    )
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      (editor) => editor && diagnosticsRuner.update(editor.document)
    )
  );

  // Call update once on start to scan the text document.
  if (vscode.window.activeTextEditor) {
    diagnosticsRuner.update(vscode.window.activeTextEditor.document);
  }
}
