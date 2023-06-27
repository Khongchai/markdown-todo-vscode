import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { DiagnosticsParser } from "../src/parser";

describe("Parser returns the expected diagnostics", () => {
  const controlledDate = new Date(1997, 8, 1); // my bd :p
  const parser = new DiagnosticsParser({
    today: controlledDate,
    daySettings: {
      critical: 2,
      deadlineApproaching: 4,
      shouldProbablyBeginWorkingOnThis: 6,
    },
  });

  test("parses single date: overdue", () => {
    // TODO @khongchai refactor
    const input = ["02/08/1997"].join("\n");

    const expected: Diagnostic[] = [
      {
        message: "",
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, 10),
      },
    ];

    const actual = parser.parse(input);

    expect(actual.length).toBe(expected.length);
    expect(actual[0].severity).toBe(expected[0].severity);
    expect(actual[0].range).toStrictEqual(expected[0].range);
  });

  test("parses single date: deadline", () => {
    const input = ["02/08/1997"].join("\n");
  });
});

describe("Parser reports invalid date", () => {
  // TODO
});
