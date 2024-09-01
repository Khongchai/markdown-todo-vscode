import { DiagnosticSeverity, Range } from "vscode";
import { DiagnosticsParser } from "../parsingService/parserExecutor";
import DateUtil from "../parsingService/dateUtils";

const controlledToday = DateUtil.getDateLastMoment(1997, 8 - 1, 1, 23); // my bd :p
const parser = new DiagnosticsParser({
  today: controlledToday,
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
  // Single date without a list should not be highlighted for anything.
  test("Single date", () => {
    const input = ["01/06/1997"].join("\n");
    assertResult(input, []);
  });

  test("Single date with time", () => {
    const input = ["01/06/1997 15:00"].join("\n");
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
      "- [ ] Take out the trash",
      "01/08/1997",
      "01/08/1997",
      "- [ ] Take out the trash",
      "01/08/1997",
      "- [ ] Take out the trash",
      "03/08/1997",
      "- [ ] Take out the trash",
      "05/08/1997",
      "- [ ] Take out the trash",
      "07/08/1997",
      "- [ ] Take out the trash",
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, 10),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(1, 0, 1, 24),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(3, 0, 3, 10),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(4, 0, 4, 24),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(5, 0, 5, 10),
      },
      {
        severity: DiagnosticSeverity.Warning,
        range: new Range(6, 0, 6, 24),
      },
      {
        severity: DiagnosticSeverity.Information,
        range: new Range(7, 0, 7, 10),
      },
      {
        severity: DiagnosticSeverity.Information,
        range: new Range(8, 0, 8, 24),
      },
    ]);
  });

  test.each([
    [["01/08/1997", "09:00"].join("\n"), DiagnosticSeverity.Error],
    [`01/08/1997 12:00`, DiagnosticSeverity.Error], // same as today at noon
    // [["01/08/1997", "13:00"].join("\n"), DiagnosticSeverity.Warning],
    // [["01/08/1997", "14:00"].join("\n"), DiagnosticSeverity.Warning],
    // [["02/08/1997", "14:00"].join("\n"), DiagnosticSeverity.Warning],
    // [["03/08/1997", "14:00"].join("\n"), DiagnosticSeverity.Information],
  ])("Multiple dates with time -- one line %j", (dateIdentifier, sev) => {
    const todayAtNoon = new Date(1997, 8 - 1, 1, 12);
    const _parser = new DiagnosticsParser({
      today: todayAtNoon,
      daySettings: {
        critical: 2,
        deadlineApproaching: 4,
      },
    });

    const input = [dateIdentifier, "- [ ] something"].join("\n");

    assertResult(
      input,
      [
        {
          // the time
          severity: sev,
          range: new Range(1, 0, 1, 5),
        },
        {
          // the item
          severity: sev,
          range: new Range(2, 0, 2, 15),
        },
      ],
      _parser
    );
  });

  test("Multiple dates with time: todos in same day throwing different diagnostics error.", () => {
    const todayAtNoon = DateUtil.getDateLastMoment(1997, 8 - 1, 1, 12);
    const _parser = new DiagnosticsParser({
      today: todayAtNoon,
      daySettings: {
        critical: 2,
        deadlineApproaching: 4,
      },
    });

    const todoItem = "- [ ] something";

    const input = [
      "01/08/1997",
      todoItem, // should show warning, without time defaults to the very last moment of the day.
      "11:00",
      todoItem, // should show error, the time is before the current time.
      "13:00",
      todoItem, // should show warning, the time is within the deadline approaching time.
      "18:00",
      todoItem, // should show warning, the time is within the deadline approaching time.
      "02/08/1997 13:00", // should show Information, the date is in the future.
      todoItem,
    ].join("\n");

    assertResult(
      input,
      [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 0, 0, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, 15),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(3, 0, 3, 15),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(4, 0, 4, 10),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(5, 0, 5, 15),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(6, 0, 6, 10),
        },
        {
          severity: DiagnosticSeverity.Warning,
          range: new Range(7, 0, 7, 15),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(8, 0, 8, 10),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(9, 0, 9, 15),
        },
      ],
      _parser
    );
  });
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
        range: new Range(0, 0, 0, 10),
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
    const input = [
      "<!-- 01/06/1997",
      "01/06/1997",
      "- [ ] Take out the trash",
    ].join("\n");
    assertResult(input, []);
  });

  test("Comment and todo list", () => {
    const input = [
      "<!-- 01/06/1997 -->",
      "01/06/1997",
      "- [ ] Take out the trash",
    ].join("\n");
    assertResult(input, [
      {
        range: new Range(1, 0, 1, 10),
        severity: DiagnosticSeverity.Error,
      },
      {
        range: new Range(2, 0, 2, 24),
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
        range: new Range(2, 0, 2, 10),
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
      "- [ ] Take out the trash",
      "- [ ] Take out the trash",
    ].join("\n");

    assertResult(input, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, 10),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(2, 0, 2, 24),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(3, 0, 3, 24),
      },
    ]);

    const input2 = [
      "01/06/1997",
      "- [ ] Take out the trash",
      "- [x] Take out the trash",
      "- [ ] Take out the trash",
      "- [x] Take out the trash",
    ].join("\n");

    assertResult(input2, [
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(0, 0, 0, 10),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(1, 0, 1, 24),
      },
      {
        severity: DiagnosticSeverity.Error,
        range: new Range(3, 0, 3, 24),
      },
    ]);
  });
});

describe("Skipping diagnostics", () => {
  describe("Skipping with skip", () => {
    test("Just skip ident", () => {
      const input = [
        "<!-- skip -->",
        "01/06/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, []);
    });

    test("Skip ident with another comment", () => {
      const input = [
        "<!-- skip -->",
        "<!-- got lazy -->",
        "01/06/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, []);
    });

    test("Skipping in the middle of a timed section", () => {
      const input = [
        "01/06/1997",
        "13:00",
        "- [ ] Take out the trash",
        "<!-- skip -->",
        "14:00",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, 5),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, 24),
        },
      ]);
    });

    test("Skip ident with another comment and todo list", () => {
      const input3 = [
        "30/05/1997",
        "- [ ] Take out the trash",
        "<!-- skip -->",
        "<!-- got lazy -->",
        "01/06/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input3, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(0, 0, 0, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, 24),
        },
      ]);
    });
  });

  describe("Skipping with moved", () => {
    test("Moved without date - incorrect syntax", () => {
      const input = [
        "<!-- moved -->",
        "01/06/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(1, 0, 1, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(2, 0, 2, 24),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to does not exist", () => {
      const input = [
        "<!-- moved 09/10/1997 -->",
        "15/08/1997",
        "- [ ] Take out the trash",
        "05/09/1997",
        "- [ ] Take out the trash",
        "08/09/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      // two lines highlighted, the moved line and the item line in the next section without its date.
      assertResult(input, [
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(0, 0, 0, "<!-- moved 09/10/1997 -->".length),
        },
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(2, 0, 2, 24),
        },
      ]);
    });

    test("Moved with date - correct syntax - moved date same as moved section", () => {
      const input = [
        "<!-- moved 01/06/1997 -->",
        "01/06/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, [
        // highlighted because the moved date is the same as the date of the section
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(0, 0, 0, "<!-- moved 01/06/1997 -->".length),
        },
        // highlighted because the date is registered to be moved but the move wasn't successful.
        {
          severity: DiagnosticSeverity.Information,
          range: new Range(2, 0, 2, 24),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to exists, and is not overdue", () => {
      const input = [
        "<!-- moved 09/08/1997 -->",
        "01/06/1997",
        "- [ ] Take out the trash",
        "05/06/1997",
        "- [ ] Take out the trash",
        "09/08/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, [
        // The moved line should not be highlighted. The highlighted one is the one that is not moved.
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(3, 0, 3, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(4, 0, 4, 24),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to exists, but is overdue", () => {
      const input = [
        "<!-- moved 09/06/1997 -->",
        "01/06/1997",
        "- [ ] Take out the trash",
        "05/06/1997",
        "- [ ] Take out the trash",
        "09/06/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, [
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(3, 0, 3, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(4, 0, 4, 24),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(5, 0, 5, 10),
        },
        {
          severity: DiagnosticSeverity.Error,
          range: new Range(6, 0, 6, 24),
        },
      ]);
    });

    test("Moved with date - correct syntax - the date to moved to exists, is not overdue, but the item to moved to does not contain the same item", () => {
      const input = [
        "<!-- moved 09/10/1997 -->",
        "07/10/1997",
        "- [ ] Take out the trash",
        "- [ ] Take out the trash 2",
        "08/10/1997",
        "- [ ] Take out the trash",
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
          range: new Range(2, 0, 2, 24),
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
        "- [ ] Take out the trash",
        "09/10/1997",
        "- [ ] Take out the trash 2",
      ].join("\n");

      assertResult(input, []);
    });

    test("Moved item is marked as finished later", () => {
      const input = [
        "<!-- moved 09/10/1997 -->",
        "07/10/1997",
        "- [ ] Take out the trash",
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
          range: new Range(2, 0, 2, 24),
        },
      ]);
    });

    test("Moved with date - invalid syntax", () => {
      const input = [
        "<!-- moved01/06/1997 -->",
        "01/09/1997",
        "- [ ] Take out the trash",
      ].join("\n");

      assertResult(input, []);
    });
  });
});
