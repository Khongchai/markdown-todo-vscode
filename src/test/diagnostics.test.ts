import { DiagnosticSeverity, Range } from "vscode";
import { DiagnosticsParser } from "../parsingService/parser";
import DateUtil from "../parsingService/utils";

const controlledToday = DateUtil.getDateLikeNormalPeople(1997, 8, 1); // my bd :p
const parser = new DiagnosticsParser({
  today: controlledToday,
  daySettings: {
    critical: 2,
    deadlineApproaching: 4,
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
    ]);
  });

  describe("(Integration tests) Dates with todos", () => {
    const todoLine1 = "- [ ] Take out the trash";
    const todoLine2 = "- [ ] Do the dishes";
    const nonTodoLine = "This is not a todo";
    test("Case 1", () => {
      const input = ["30/07/1997", todoLine1, todoLine2, nonTodoLine].join(
        "\r\n"
      );

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 0, 0, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, todoLine1.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, todoLine2.length),
        },
      ]);
    });

    test("Case 2: TODO Delimits by text: closing off a todo section", () => {
      const input = [
        "30/07/1997",
        "random stuff",
        todoLine1,
        "<!-- end section -->",
        "random stuff",
        todoLine2, // this should not be recognized
        todoLine2, // neither should this
      ].join("\r\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 0, 0, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, todoLine1.length),
        },
      ]);
    });

    test("Case 3: Recoginize only one date within the same line", () => {
      const input = ["30/07/1997 01/08/1997"].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 0, 0, 10),
        },
        {
          severity: DiagnosticSeverity.Hint,
          range: new Range(0, 11, 0, 21),
        },
      ]);
    });
  });
});

describe("Parser does not report date within a code block", () => {
  test("Incomplete code block and todo list", () => {
    const input = [
      "```",
      "01/06/1997",
      "- [ ] Take out the trash",
      "- [ ] Do the dishes",
      "01/06/1997",
      "- [ ] Take out the trash",
      "- [ ] Do the dishes",
    ].join("\n");

    assertResult(input, []);
  });
  test("Code block and todo list", () => {
    const input = [
      "```",
      "01/06/1997",
      "```",
      "- [ ] Take out the trash",
      "- [ ] Do the dishes",
      "01/06/1997",
      "- [ ] Take out the trash",
      "- [ ] Do the dishes",
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(5, 0, 5, 10),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(6, 0, 6, 24),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(7, 0, 7, 19),
      },
    ]);
  });
});

describe("Parser reports invalid date", () => {
  // TODO
});
