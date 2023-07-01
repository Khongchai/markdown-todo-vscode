import { DiagnosticCollection, TextDocument } from "vscode";
import { DiagnosticsParser } from "./parsingService/parser";

interface DiagnosticsRunner {
  update(document: TextDocument): void;
  deleteDocument(document: TextDocument): void;
}

const parser = new DiagnosticsParser({});

export function createDiagnosticsRunner(
  diagnosticsCollection: DiagnosticCollection
): DiagnosticsRunner {
  // Main entry point.
  function update(document: TextDocument) {
    diagnosticsCollection.set(document.uri, parser.parse(document.getText()));
  }

  function deleteDocument(document: TextDocument) {
    diagnosticsCollection.delete(document.uri);
  }

  return {
    update,
    deleteDocument,
  } as DiagnosticsRunner;
}
