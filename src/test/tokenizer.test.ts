import { DiagnosticsTokenizer } from "../parsingService/tokenizer";
import { Token } from "../parsingService/types";

function runTest(s: string, expectedTokens: Token[]) {
  const tokenizer = new DiagnosticsTokenizer();
  const resultingTokens = [];
  for (const token of tokenizer.tokenize(s)) {
    resultingTokens.push(token);
  }

  expect(resultingTokens).toStrictEqual(expectedTokens);
}

describe("Match list tokens", () => {
  const case1 = "- [ ] Hello, world!";
  test(case1, () => runTest(case1, [Token.todoItem, Token.lineEnd]));

  const case2 = "+ [ ] Hello, world!";
  test(case2, () => runTest(case2, [Token.todoItem, Token.lineEnd]));

  const case3 = "- [ ] Hello, world! ";
  test(case3, () => runTest(case3, [Token.todoItem, Token.lineEnd]));
});

test.each([
  { raw: "01/06/1997", expected: [Token.date, Token.lineEnd] },
  { raw: "01/06/1997", expected: [Token.date, Token.lineEnd] },
  {
    raw: "01/06/1997    01/06/1997",
    expected: [Token.date, Token.date, Token.lineEnd],
  },
])(`Match date token: %j case`, ({ raw, expected }) => {
  runTest(raw, expected);
});

// time must be in the format HH:MM with nothing other than white spaces around it
test.each([
  { raw: "15h:20m", expected: [Token.time, Token.lineEnd] },
  { raw: "00h:00m", expected: [Token.time, Token.lineEnd] },
  {
    raw: "23h:59m  01h:00m",
    expected: [Token.time, Token.time, Token.lineEnd],
  },
])(`Match time token: %j case`, ({ raw, expected }) => {
  runTest(raw, expected);
});

test.each([
  {
    raw: "01/08/1997 15h:20m",
    expected: [Token.date, Token.time, Token.lineEnd],
  },
  {
    raw: "01/06/1997 23h:59m  01h:00m",
    expected: [Token.date, Token.time, Token.time, Token.lineEnd],
  },
  {
    raw: [
      "01/06/1997",
      "- [ ] Something",
      "13h:00m",
      "- [ ] Something else",
      "02/06/1997 13h:00m",
      "- [ ] Something",
    ].join("\n"),
    expected: [
      Token.date,
      Token.newLine,
      Token.todoItem,
      Token.newLine,
      Token.time,
      Token.newLine,
      Token.todoItem,
      Token.newLine,
      Token.date,
      Token.time,
      Token.newLine,
      Token.todoItem,
      Token.lineEnd,
    ],
  },
])(`Match date and time token: %j case`, ({ raw, expected }) => {
  runTest(raw, expected);
});

test.each([
  { raw: "01/088/1997", expected: [Token.lineEnd] },
  { raw: "018/08/1997", expected: [Token.lineEnd] },
  { raw: "01/08/19979", expected: [Token.date, Token.lineEnd] },
  { raw: "10h:50m0", expected: [Token.time, Token.lineEnd] },
  { raw: "_10h:50m_", expected: [Token.time, Token.lineEnd] },
  {
    raw: "1:50",
    expected: [Token.lineEnd],
  },
  {
    raw: "10:5",
    expected: [Token.lineEnd],
  },
  {
    raw: "10:50",
    expected: [Token.lineEnd],
  },
])(`Invalid date or time: %j case`, ({ raw, expected }) => {
  runTest(raw, expected);
});

describe("Invalid list tokens", () => {
  const case1 = "- [ ]Hello, world!";
  test(case1, () => runTest(case1, [Token.lineEnd]));
});

describe("Match backtick code block", () => {
  test("```", () => runTest("```", [Token.tripleBackTick, Token.lineEnd]));
  // ignore if not 3 backticks.
  test("`", () => runTest("`", [Token.lineEnd]));
});

describe("Match comment tokens", () => {
  test("<!--", () => runTest("<!--", [Token.commentStart, Token.lineEnd]));
  // commentEnd if section end is not preceded by a commentStart
  test("-->", () => runTest("-->", [Token.lineEnd]));
  test("<!-- -->", () =>
    runTest("<!-- -->", [Token.commentStart, Token.commentEnd, Token.lineEnd]));
  test("<!---->", () =>
    runTest("<!---->", [Token.commentStart, Token.commentEnd, Token.lineEnd]));
  test("<!-- foobarbaz -->", () =>
    runTest("<!-- foobarbaz -->", [
      Token.commentStart,
      Token.commentEnd,
      Token.lineEnd,
    ]));
  test("<!--foobarbaz-->", () =>
    runTest("<!--foobarbaz-->", [
      Token.commentStart,
      Token.commentEnd,
      Token.lineEnd,
    ]));
  test("<!", () => runTest("<!", [Token.lineEnd]));
});

describe("Comment identifiers", () => {
  describe("end section", () => {
    test("end section only", () =>
      runTest("<!-- end section -->", [
        Token.commentStart,
        Token.commentEnd,
        Token.sectionEndIdent,
        Token.lineEnd,
      ]));
    test("end section with other stuff", () =>
      runTest("<!--blegh end section blagh-->", [
        Token.commentStart,
        Token.commentEnd,
        Token.lineEnd,
      ]));
  });

  describe("skip", () => {
    test("skip only", () => {
      runTest("<!-- skip -->", [
        Token.commentStart,
        Token.commentEnd,
        Token.skipIdent,
        Token.lineEnd,
      ]);
    });

    test("skip with other stuff", () => {
      runTest("<!-- blegh skip blagh -->", [
        Token.commentStart,
        Token.commentEnd,
        Token.lineEnd,
      ]);
    });
  });

  describe("moved", () => {
    test("moved only", () => {
      runTest("<!-- moved -->", [
        Token.commentStart,
        Token.commentEnd,
        Token.movedIdent,
        Token.lineEnd,
      ]);
    });

    test("moved with date", () => {
      runTest("<!-- moved 20/03/2023 -->", [
        Token.commentStart,
        Token.commentEnd,
        Token.movedIdent,
        Token.date,
        Token.lineEnd,
      ]);
    });

    test("moved with other stuff", () => {
      runTest("<!-- blegh moved 20/03/2023 blagh -->", [
        Token.commentStart,
        Token.commentEnd,
        Token.lineEnd,
      ]);
    });
  });
});
