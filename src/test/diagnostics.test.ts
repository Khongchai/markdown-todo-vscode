import { describe, test } from "node:test";
import { DiagnosticsParser } from "../parser";
import { Diagnostic, DiagnosticSeverity, Position, Range } from "vscode";

describe("Parser returns the expected diagnostics", () => {
  const controlledDate = new Date(1997, 08, 1);
  const parser = new DiagnosticsParser({
    today: controlledDate,
    settings: {
      critical: 2,
      hintIfLessThanDays: 2,
      deadlineApproaching: 2,
      shouldProbablyBeginWorkingOnThis: 2,
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

    expect(expected.length).toBe(actual.length);
    expect(expected[0]).toBe(actual[0]);
  });

  test("parses single date: deadline", () => {
    const input = ["02/08/1997"].join("\n");
  });
});

describe("Parser reports invalid date", () => {
  // TODO
});
