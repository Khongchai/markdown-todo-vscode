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

describe("Match section end", () => {
  test("single", () =>
    runTest("<!-- end section -->", [Token.sectionEnd, Token.lineEnd]));
});
