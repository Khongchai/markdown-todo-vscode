const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };
const Range = jest.fn();
const Diagnostic = jest.fn();

export { Diagnostic, DiagnosticSeverity, Range };
