"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Range = exports.DiagnosticSeverity = exports.Diagnostic = void 0;
const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };
exports.DiagnosticSeverity = DiagnosticSeverity;
const Range = jest.fn();
exports.Range = Range;
const Diagnostic = jest.fn();
exports.Diagnostic = Diagnostic;
//# sourceMappingURL=vscode.js.map