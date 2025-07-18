import { DiagnosticSeverity, Range } from "vscode";
import {
  dateAndTimePattern,
  datePattern,
  timePattern,
} from "../parsingService/constants";
import { DiagnosticsParser } from "../parsingService/parserExecutor";

const todoItem = "- [ ] Take out the trash";

/**
 * This is the source of truth for today in all tests
 */
const todayAtMidnight = new Date(1997, 8 - 1, 1); // my bd :p
const parser = new DiagnosticsParser({
  today: todayAtMidnight,
  daySettings: {
    critical: 2,
    deadlineApproaching: 4,
  },
});

function assertResult(
  input: string,
  expected: { severity: DiagnosticSeverity; range: Range }[],
  theParser = parser
) {
  const actual = theParser.parse(input);

  expect(actual.length).toBe(expected.length);

  for (let i = 0; i < actual.length; i++) {
    try {
      expect(actual.length).toBe(expected.length);
      expect(actual[i].severity).toBe(expected[i].severity);
      expect(actual[i].range).toStrictEqual(expected[i].range);
    } catch (e) {
      console.error("input: \n", input);
      console.error(
        `actual: ${JSON.stringify(actual[i].range)}, expected: ${JSON.stringify(
          expected[i].range
        )}`
      );
      throw e;
    }
  }
}

describe("Parser returns the expected diagnostics", () => {
  // Single date without a list should not be highlighted for anything.
  test("Single date", () => {
    const input = ["01/06/1997"].join("\n");
    assertResult(input, []);
  });

  test("Single date with time", () => {
    const input = ["01/06/1997 15h:00m"].join("\n");
    assertResult(input, []);
  });

  test("Single date with some texts", () => {
    const input = ["some random text 01/06/1997", "- [ ] a task"].join("\n");
    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 17, 0, 27),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(1, 0, 1, 12),
      },
    ]);
  });

  test("Multiple dates with no time", () => {
    const input = [
      "30/07/1997",
      todoItem,
      "01/08/1997",
      "01/08/1997",
      todoItem,
      "01/08/1997",
      todoItem,
      "03/08/1997",
      todoItem,
      "05/08/1997",
      todoItem,
      "07/08/1997",
      todoItem,
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(1, 0, 1, todoItem.length),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(3, 0, 3, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(4, 0, 4, todoItem.length),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(5, 0, 5, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(6, 0, 6, todoItem.length),
      },
      {
        severity: DiagnosticSeverity.Information,
        range: new Range(7, 0, 7, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Information,
        range: new Range(8, 0, 8, todoItem.length),
      },
    ]);
  });

  describe("Multiple dates with time: oneline", () => {
    test("Date and time on different line, past deadline", () => {
      const todayAtNoon = new Date(1997, 8 - 1, 1, 12);
      const _parser = new DiagnosticsParser({
        today: todayAtNoon,
        daySettings: {
          critical: 2,
          deadlineApproaching: 4,
        },
      });
      const input = ["01/08/1997", "09h:00m", todoItem].join("\n");

      assertResult(
        input,
        [
          {
            severity: DiagnosticSeverity.Error,
            range: new Range(1, 0, 1, timePattern.length),
          },
          {
            severity: DiagnosticSeverity.Error,
            range: new Range(2, 0, 2, todoItem.length),
          },
        ],
        _parser
      );
    });

    test("Date and time on same line, past deadline", () => {
      const todayAtNoon = new Date(1997, 8 - 1, 1, 12);
      const _parser = new DiagnosticsParser({
        today: todayAtNoon,
        daySettings: {
          critical: 2,
          deadlineApproaching: 4,
        },
      });
      const input = ["01/08/1997 09h:00m", todoItem].join("\n");

      assertResult(
        input,
        [
          {
            severity: DiagnosticSeverity.Error,
            range: new Range(0, 0, 0, dateAndTimePattern.length),
          },
          {
            severity: DiagnosticSeverity.Error,
            range: new Range(1, 0, 1, todoItem.length),
          },
        ],
        _parser
      );
    });

    test("Date and time on different line, deadline approaching", () => {
      const todayAtNoon = new Date(1997, 8 - 1, 1, 12);
      const _parser = new DiagnosticsParser({
        today: todayAtNoon,
        daySettings: {
          critical: 2,
          deadlineApproaching: 4,
        },
      });
      const input = ["01/08/1997", "13h:00m", todoItem].join("\n");

      assertResult(
        input,
        [
          {
            severity: DiagnosticSeverity.Warning,
            range: new Range(1, 0, 1, timePattern.length),
          },
          {
            severity: DiagnosticSeverity.Warning,
            range: new Range(2, 0, 2, todoItem.length),
          },
        ],
        _parser
      );
    });
  });

  test("Multiple dates with time: todos in same day throwing different diagnostics error.", () => {
    const todayAtNoon = new Date(1997, 8 - 1, 1, 12);
    const _parser = new DiagnosticsParser({
      today: todayAtNoon,
      daySettings: {
        critical: 2,
        deadlineApproaching: 4,
      },
    });

    const input = [
      "01/08/1997",
      todoItem, // should show warning, without time defaults to the very last moment of the day.
      "11h:00m",
      todoItem, // should show error, the time is before the current time.
      "13h:00m",
      todoItem, // should show warning, the time is within the deadline approaching time.
      "18h:00m",
      todoItem, // should show warning, the time is within the deadline approaching time.
      "04/08/1997 13h:00m", // should show Information, the date is in the future.
      todoItem,
      "31/08/1997", // nichts, die Zeit ist in der Zukunft
      todoItem,
    ].join("\n");

    assertResult(
      input,
      [
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(0, 0, 0, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(1, 0, 1, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, timePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(3, 0, 3, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(4, 0, 4, timePattern.length),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(5, 0, 5, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(6, 0, 6, timePattern.length),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(7, 0, 7, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(8, 0, 8, dateAndTimePattern.length),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(9, 0, 9, todoItem.length),
        },
      ],
      _parser
    );
  });
});

describe("(Integration tests) Dates with todos", () => {
  const todoLine1 = todoItem;
  const todoLine2 = "- [ ] Do the dishes";
  const nonTodoLine = "This is not a todo";
  test("Case 1", () => {
    const input = ["30/07/1997", todoLine1, todoLine2, nonTodoLine].join(
      "\r\n"
    );

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, datePattern.length),
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
        range: new Range(0, 0, 0, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(2, 0, 2, todoLine1.length),
      },
    ]);
  });

  test("Case 3: Recognize only one date within the same line", () => {
    const input = ["30/07/1997 01/08/1997"].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Hint,
        range: new Range(0, 11, 0, 21),
      },
    ]);
  });

  test("Case 4: If a list is checked, skip it", () => {
    const input = [
      "30/07/1997",
      "- [x] Take out the trash",
      "- [ ] Walk the cat",
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(2, 0, 2, 18),
      },
    ]);
  });
});

describe("Parser does not report date within a comment", () => {
  test("Only date", () => {
    const input = ["<!-- 01/06/1997 -->"].join("\n");
    assertResult(input, []);
  });
  test("Incomplete comment and todo list", () => {
    const input = ["<!-- 01/06/1997", "01/06/1997", todoItem].join("\n");
    assertResult(input, []);
  });

  test("Comment and todo list", () => {
    const input = ["<!-- 01/06/1997 -->", "01/06/1997", todoItem].join("\n");
    assertResult(input, [
      {
        range: new Range(1, 0, 1, datePattern.length),
        severity: DiagnosticSeverity.Error,
      },
      {
        range: new Range(2, 0, 2, todoItem.length),
        severity: DiagnosticSeverity.Error,
      },
    ]);
  });
});

describe("Parser does not report date within a code block", () => {
  test("Incomplete code block and todo list", () => {
    const input = [
      "```",
      "01/06/1997",
      todoItem,
      "- [ ] Do the dishes",
      "01/06/1997",
      todoItem,
      "- [ ] Do the dishes",
    ].join("\n");

    assertResult(input, []);
  });
  test("Code block and todo list", () => {
    const input = [
      "```",
      "01/06/1997",
      "```",
      todoItem,
      "- [ ] Do the dishes",
      "01/06/1997",
      todoItem,
      "- [ ] Do the dishes",
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(5, 0, 5, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(6, 0, 6, todoItem.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(7, 0, 7, 19),
      },
    ]);
  });
});

describe("Finished list don't get reported", () => {
  test("Just one finished list", () => {
    const input = ["01/06/1997", "- [x] Take out the trash"].join("\n");
    assertResult(input, []);
  });

  test("Finished list and unfinished list", () => {
    const input = [
      "01/06/1997",
      "- [x] Take out the trash",
      "02/06/1997",
      "- [ ] Do the dishes",
    ].join("\n");
    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(2, 0, 2, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(3, 0, 3, 19),
      },
    ]);
  });

  test("Finished list mixed with unfinished.", () => {
    const input = [
      "01/06/1997",
      "- [x] Take out the trash",
      todoItem,
      todoItem,
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(2, 0, 2, todoItem.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(3, 0, 3, todoItem.length),
      },
    ]);

    const input2 = [
      "01/06/1997",
      todoItem,
      "- [x] Take out the trash",
      todoItem,
      "- [x] Take out the trash",
    ].join("\n");

    assertResult(input2, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, datePattern.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(1, 0, 1, todoItem.length),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(3, 0, 3, todoItem.length),
      },
    ]);
  });
});

describe("Skipping diagnostics", () => {
  describe("Skipping with skip", () => {
    test("Just skip ident", () => {
      const input = ["<!-- skip -->", "01/06/1997", todoItem].join("\n");

      assertResult(input, []);
    });

    test("Skip ident with another comment", () => {
      const input = [
        "<!-- skip -->",
        "<!-- got lazy -->",
        "01/06/1997",
        todoItem,
      ].join("\n");

      assertResult(input, []);
    });

    test("Skipping in the middle of a timed section", () => {
      const input = [
        "01/06/1997",
        "13h:00m",
        todoItem,
        "<!-- skip -->",
        "14h:00m",
        todoItem,
      ].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, 7),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, todoItem.length),
        },
      ]);
    });

    test("Skip ident with another comment and todo list", () => {
      const input3 = [
        "30/05/1997",
        todoItem,
        "<!-- skip -->",
        "<!-- got lazy -->",
        "01/06/1997",
        "06h:00m",
        todoItem,
        "07h:00m",
        todoItem,
        todoItem,
        "02/06/1997",
        todoItem,
      ].join("\n");

      assertResult(input3, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 0, 0, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(10, 0, 10, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(11, 0, 11, todoItem.length),
        },
      ]);
    });
    test("Skipping time should affect just the time", () => {
      const input3 = [
        "30/05/1997",
        "<!-- skip -->",
        "09h:00m",
        todoItem,
        "23h:00m",
        todoItem,
        "02/06/1997",
        todoItem,
      ].join("\n");

      assertResult(input3, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(4, 0, 4, timePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(5, 0, 5, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(6, 0, 6, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(7, 0, 7, todoItem.length),
        },
      ]);
    });
  });

  describe("Skipping with moved", () => {
    test("Moved without date - incorrect syntax", () => {
      const input = ["<!-- moved -->", "01/06/1997", todoItem].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, todoItem.length),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to does not exist", () => {
      const input = [
        "<!-- moved 09/10/1997 -->",
        "15/08/1997",
        todoItem,
        "05/09/1997",
        todoItem,
        "08/09/1997",
        todoItem,
      ].join("\n");

      // two lines highlighted, the moved line and the item line in the next section without its date.
      assertResult(input, [
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(0, 0, 0, "<!-- moved 09/10/1997 -->".length),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(2, 0, 2, todoItem.length),
        },
      ]);
    });

    test("Moved with date - correct syntax - moved date same as moved section", () => {
      const input = ["<!-- moved 01/06/1997 -->", "01/06/1997", todoItem].join(
        "\n"
      );

      assertResult(input, [
        // highlighted because the moved date is the same as the date of the section
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(0, 0, 0, "<!-- moved 01/06/1997 -->".length),
        },
        // highlighted because the date is registered to be moved but the move wasn't successful.
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(2, 0, 2, todoItem.length),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to exists, and is not overdue", () => {
      const input = [
        "<!-- moved 09/08/1997 -->",
        "01/06/1997",
        todoItem,
        "05/06/1997",
        todoItem,
        "09/08/1997",
        todoItem,
      ].join("\n");

      assertResult(input, [
        // The moved line should not be highlighted. The highlighted one is the one that is not moved.
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(3, 0, 3, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(4, 0, 4, todoItem.length),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to exists, but is overdue", () => {
      const input = [
        "<!-- moved 09/06/1997 -->",
        "01/06/1997",
        todoItem,
        "05/06/1997",
        todoItem,
        "09/06/1997",
        todoItem,
      ].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(3, 0, 3, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(4, 0, 4, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(5, 0, 5, datePattern.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(6, 0, 6, todoItem.length),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to exists, is not overdue, but the item to moved to does not contain the same item", () => {
      const input = [
        "<!-- moved 09/10/1997 -->",
        "07/10/1997",
        todoItem,
        "- [ ] Take out the trash 2",
        "08/10/1997",
        todoItem,
        "09/10/1997",
        "- [ ] Take out the trash 3",
      ].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(0, 0, 0, "<!-- moved 09/06/1997 -->".length),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(2, 0, 2, todoItem.length),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(3, 0, 3, 26),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to exists, is not overdue, but only moved unfinished items", () => {
      const input = [
        "<!-- moved 09/10/1997 -->",
        "07/10/1997",
        "- [x] Take out the trash",
        "- [ ] Take out the trash 2",
        "08/10/1997",
        todoItem,
        "09/10/1997",
        "- [ ] Take out the trash 2",
      ].join("\n");

      assertResult(input, []);
    });

    test("Moved item is marked as finished later", () => {
      const input = [
        "<!-- moved 09/10/1997 -->",
        "07/10/1997",
        todoItem,
        "- [ ] Take out the trash 2",
        "09/10/1997",
        "- [x] Take out the trash 2",
      ].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(0, 0, 0, "<!-- moved 09/10/1997 -->".length),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(2, 0, 2, todoItem.length),
        },
      ]);
    });

    test("Moved with date - invalid syntax", () => {
      const input = ["<!-- moved01/06/1997 -->", "01/09/1997", todoItem].join(
        "\n"
      );

      assertResult(input, []);
    });
  });

  describe("Edge cases", () => {
    test("When another line starts with a single digit number, the date starts at the wrong position", () => {
      const date = "# 01/10/1990";
      const text = "- [ ] lksjdflkjsdf";
      const input = ["2", date, text].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 2, 1, date.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, text.length),
        },
      ]);
    });
    test("When another line starts with an odd number of digits, the date starts at the wrong position", () => {
      const date = "# 01/10/1990";
      const text = "- [ ] lksjdflkjsdf";
      const input = ["hello 222", date, text].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 2, 1, date.length),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, text.length),
        },
      ]);
    });
  });
});
