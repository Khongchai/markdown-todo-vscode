const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };
const Range = jest.fn(
  (startline: number, startchar: number, endline: number, endchar: number) => ({
    startline,
    startchar,
    endline,
    endchar,
  })
);
const Diagnostic = jest.fn();

export { Diagnostic, DiagnosticSeverity, Range };
