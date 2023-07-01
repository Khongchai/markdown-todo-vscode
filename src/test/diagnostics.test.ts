import { DiagnosticSeverity, Range } from "vscode";
import { DiagnosticsParser } from "../parsingService/parser";
import DateUtil from "../utils";

const controlledToday = DateUtil.getDateLikeNormalPeople(1997, 8, 1); // my bd :p
const parser = new DiagnosticsParser({
  today: controlledToday,
  daySettings: {
    critical: 2,
    deadlineApproaching: 4,
    shouldProbablyBeginWorkingOnThis: 6,
  },
});

function assertResult(
  input: string,
  expected: { severity: DiagnosticSeverity; range: Range }[]
) {
  const actual = parser.parse(input);

  expect(actual.length).toBe(expected.length);

  for (let i = 0; i < actual.length; i++) {
    try {
      expect(actual.length).toBe(expected.length);
      expect(actual[i].severity).toBe(expected[i].severity);
      expect(actual[i].range).toStrictEqual(expected[i].range);
    } catch (e) {
      console.info("input: \n", input);
      console.info(
        `actual: ${JSON.stringify(actual[i].range)}, expected: ${JSON.stringify(
          expected[i].range
        )}`
      );
      throw e;
    }
  }
}

describe("Parser returns the expected diagnostics", () => {
  describe("Overdue", () => {
    test("Single date", () => {
      const input = ["01/06/1997"].join("\n");
      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 0, 0, 10),
        },
      ]);
    });

    test("Single date with some texts", () => {
      const input = ["some random text 01/06/1997"].join("\n");
      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 17, 0, 27),
        },
      ]);
    });

    test("Multiple dates", () => {
      const input = ["", "01/01/1997", "01/01/1997", "01/01/1997"].join("\n");
      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(3, 0, 3, 10),
        },
      ]);
    });
  });

  test("Multiple date", () => {
    const input = [
      "30/07/1997",
      "01/08/1997",
      "03/08/1997",
      "05/08/1997",
      "07/08/1997",
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, 10),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(1, 0, 1, 10),
      },
      {
        severity: DiagnosticSeverity.Information,
        range: new Range(2, 0, 2, 10),
      },
      {
        severity: DiagnosticSeverity.Hint,
        range: new Range(3, 0, 3, 10),
      },
    ]);
  });

  // describe("(Integration tests) Dates with todos", () => {
  //   const todoLine1 = "- [ ] Take out the trash";
  //   const todoLine2 = "- [ ] Do the dishes";
  //   test("Case 1", () => {
  //     const input = [
  //       "30/07/1997",
  //       "**Description for this todo**",
  //       todoLine1,
  //       todoLine2,
  //     ].join("\r\n");

  //     assertResult(input, [
  //       {
  //         severity: DiagnosticSeverity.Error,
  //         range: new Range(0, 0, 0, 10),
  //       },
  //       {
  //         severity: DiagnosticSeverity.Error,
  //         range: new Range(1, 0, 1, todoLine1.length),
  //       },
  //       {
  //         severity: DiagnosticSeverity.Error,
  //         range: new Range(2, 0, 2, todoLine2.length),
  //       },
  //     ]);
  //   });

  //   // Worry about this when the first case passes.
  //   // test("Case 2", () => {
  //   //   const input = [
  //   //     // expect warning
  //   //     "01/08/1997",
  //   //     todoLine1,
  //   //     todoLine2,
  //   //     "\r\n",
  //   //     // nothing
  //   //     "09/09/1997",
  //   //     todoLine1,
  //   //     // expect overdue error
  //   //     "30/07/1997",
  //   //     // These should not be underlined
  //   //     "Some explanation about this todo",
  //   //     "Some explanation about this todo 2",
  //   //     todoLine1,
  //   //     todoLine2,
  //   //   ].join("\n");

  //   //   assertResult(input, [
  //   //     {
  //   //       range: new Range(0, 0, 0, 10),
  //   //       severity: DiagnosticSeverity.Warning,
  //   //     },
  //   //     {
  //   //       range: new Range(1, 0, 1, todoLine1.length),
  //   //       severity: DiagnosticSeverity.Warning,
  //   //     },
  //   //     {
  //   //       range: new Range(2, 0, 2, todoLine2.length),
  //   //       severity: DiagnosticSeverity.Warning,
  //   //     },
  //   //   ]);
  //   // });
  // });
});

describe("Parser reports invalid date", () => {
  // TODO
});
