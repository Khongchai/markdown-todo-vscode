import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Range,
  TextDocument,
} from "vscode";
import { DiagnosticsParser } from "./parser";

interface DiagnosticsRunner {
  update(document: TextDocument): void;
  deleteDocument(document: TextDocument): void;
}

const parser = new DiagnosticsParser({});

export function createDiagnosticsRunner(
  diagnosticsCollection: DiagnosticCollection
) {
  // Main entry point.
  function update(document: TextDocument) {
    diagnosticsCollection.set(document.uri, parser.parse(document));
  }

  function deleteDocument(document: TextDocument) {
    diagnosticsCollection.delete(document.uri);
  }

  return {
    update,
    deleteDocument,
  } as DiagnosticsRunner;
}
