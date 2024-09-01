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
        return [endSectionCompletion];
      },
    }),
    vscode.workspace.onDidCloseTextDocument((e) =>
      diagnosticsRunner.deleteDocument(e)
    ),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) return;
      diagnosticsRunner.update(editor.document);
    })
  );

  // Call update once on start to scan the text document.
  if (vscode.window.activeTextEditor) {
    diagnosticsRunner.update(vscode.window.activeTextEditor.document);
  }
}
