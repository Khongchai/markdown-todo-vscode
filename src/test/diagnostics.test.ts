import { Diagnostic, DiagnosticSeverity, Range } from "vscode";
import { DiagnosticsParser } from "../parser";
import DateUtil from "../utils";

describe("Parser returns the expected diagnostics", () => {
  const controlledToday = DateUtil.getDateLikeNormalPeople(1997, 8, 1); // my bd :p
  const parser = new DiagnosticsParser({
    today: controlledToday,
    daySettings: {
      critical: 2,
      deadlineApproaching: 4,
      shouldProbablyBeginWorkingOnThis: 6,
    },
  });

  test("parses single date: overdue", () => {
    // TODO @khongchai refactor
    const input = ["01/06/1997"].join("\n");

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

  // TODO @khongchai enable this test case
  // test("parses single date: overdue", () => {
  //   // TODO @khongchai refactor
  //   const input = ["some random text 01/06/1997"].join("\n");

  //   const expected: Diagnostic[] = [
  //     {
  //       message: "",
  //       severity: DiagnosticSeverity.Error,
  //       range: new Range(0, 0, 0, 10),
  //     },
  //   ];

  // TODO @khongchai enable this test case
  // test("parses multiple date: overdue", () => {
  //   // TODO @khongchai refactor
  //   const input = ["01/01/1997", "01/01/1997", "01/01/1997"].join("\n");

  //   const expected: Diagnostic[] = [
  //     {
  //       message: "",
  //       severity: DiagnosticSeverity.Error,
  //       range: new Range(0, 0, 0, 10),
  //     },
  //   ];

  //   const actual = parser.parse(input);

  //   expect(actual.length).toBe(expected.length);
  //   expect(actual[0].severity).toBe(expected[0].severity);
  //   expect(actual[0].range).toStrictEqual(expected[0].range);
  // });

  test("parses single date: valid date", () => {
    const input = ["01/09/1997"].join("\n");

    const expected: Diagnostic[] = [];

    const actual = parser.parse(input);

    expect(actual.length).toBe(expected.length);
  });

  test("parses single date: deadline", () => {
    const input = ["02/08/1997"].join("\n");
  });
});

describe("Parser reports invalid date", () => {
  // TODO
});
