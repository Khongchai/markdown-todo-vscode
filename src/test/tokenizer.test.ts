import { DiagnosticsTokenizer } from "../parsingService/tokenizer";
import { Token } from "../parsingService/types";

// TODO refactor the test into a more readable format.
describe("Tokenizer", () => {
  describe("Recognize todo", () => {
    const case1 = "- [ ] Hello, world!";
    test(case1, () => {
      const tokenizer = new DiagnosticsTokenizer();
      const resultingTokens = [];
      for (const token of tokenizer.tokenize(case1)) {
        resultingTokens.push(token);
      }

      expect(resultingTokens).toStrictEqual([Token.todoItem, Token.lineEnd]);
    });

    const case2 = "- [ ] Hello, world! ";
    test(case2, () => {
      const tokenizer = new DiagnosticsTokenizer();
      const resultingTokens = [];
      for (const token of tokenizer.tokenize(case2)) {
        resultingTokens.push(token);
      }

      expect(resultingTokens).toStrictEqual([Token.todoItem, Token.lineEnd]);
    });
  });
});
