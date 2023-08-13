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

describe("Match date tokens", () => {
  const case1 = "01/06/1997";
  test(case1, () => runTest(case1, [Token.date, Token.lineEnd]));

  const case2 = "01/06/1997    ";
  test(case2, () => runTest(case2, [Token.date, Token.lineEnd]));

  const case3 = "01/06/1997    01/06/1997";
  test(case3, () => runTest(case3, [Token.date, Token.date, Token.lineEnd]));
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
