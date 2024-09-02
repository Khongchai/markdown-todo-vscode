import * as vscode from "vscode";
import DiagnosticsRunnerImpl from "./diagnosticsRunner";

export function activate(context: vscode.ExtensionContext) {
  const diagnosticsRunner = new DiagnosticsRunnerImpl(
    "markdown-todo-extension",
    context
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      diagnosticsRunner.update(e.document);
    }),
    vscode.languages.registerCompletionItemProvider("markdown", {
      provideCompletionItems: () => {
        const endSectionCompletion = new vscode.CompletionItem(
          "<!-- end section -->"
        );
        const skipCompletion = new vscode.CompletionItem("<!-- skip -->");
        return [endSectionCompletion, skipCompletion];
      },
    }),
    vscode.workspace.onDidCloseTextDocument((e) =>
      diagnosticsRunner.deleteDocument(e)
    ),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) return;
      diagnosticsRunner.update(editor.document);
    }),
    vscode.window.onDidChangeWindowState((windowState) => {
      if (windowState.focused && vscode.window.activeTextEditor) {
        // this is to udpate the time
        diagnosticsRunner.update(vscode.window.activeTextEditor.document);
      }
    })
  );

  // Call update once on start to scan the text document.
  if (vscode.window.activeTextEditor) {
    diagnosticsRunner.update(vscode.window.activeTextEditor.document);
  }
}
