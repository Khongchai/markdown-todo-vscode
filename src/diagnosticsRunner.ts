import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Range,
  TextDocument,
  TextDocumentContentChangeEvent,
} from "vscode";

interface DiagnosticsRunner {
  update(document: TextDocument): void;
  deleteDocument(document: TextDocument): void;
}

export function createDiagnosticsRunner(
  diagnosticsCollection: DiagnosticCollection
) {
  function update(document: TextDocument) {
    const diagnostics: Diagnostic[] = [];

    // mock, just to underline the first line.

    const lineLength = document.lineAt(0).text.length;
    const range = new Range(0, 0, 0, lineLength);
    diagnostics.push(
      new Diagnostic(range, "test message", DiagnosticSeverity.Error)
    );

    diagnosticsCollection.set(document.uri, diagnostics);
  }

  function deleteDocument(document: TextDocument) {
    diagnosticsCollection.delete(document.uri);
  }

  return {
    update,
    deleteDocument,
  } as DiagnosticsRunner;
}
