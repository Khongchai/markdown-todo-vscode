import { DateParsedEvent, DiagnosticsParser } from "../parsingService/parser";
import DateUtil from "../parsingService/utils";

// Modify this later when we have more visitors.
type Expected = Parameters<DateParsedEvent>;

function runTest(
  input: string,
  // Any of the parameters of parservisitor
  expecteds: Expected[]
) {
  const results: Expected[] = [];
  const parser = new DiagnosticsParser({
    visitors: [
      {
        onNewLineAtDate: (...args) => {
          results.push(args);
        },
        onEndLineAtDate: (...args) => {
          results.push(args);
        },
      },
    ],
  });
  parser.parse(input);

  expect(results.length).toBe(expecteds.length);
  expect(results).toStrictEqual(expecteds);
}

describe("visitorsTest", () => {
  it("tests a single date", () => {
    const input = ["01/06/1997   ", "hello"].join("\n");

    runTest(input, [[DateUtil.getDateLikeNormalPeople(1997, 6, 1), 0, 13]]);
  });

  it("tests multiple dates", () => {
    const input = ["01/06/1997   ", "hello", "31/12/1997"].join("\n");

    runTest(input, [
      [DateUtil.getDateLikeNormalPeople(1997, 6, 1), 0, 13],
      [DateUtil.getDateLikeNormalPeople(1997, 12, 31), 2, 10],
    ]);
  });

  it("does not gets called within a code block", () => {
    const input = ["```01/06/1997   ```", "hello"].join("\n");

    runTest(input, []);
  });

  it("does not gets called from an incomplete code block", () => {
    const input = ["```01/06/1997", "01/02/2023", "03/04/2025"].join("\n");

    runTest(input, []);
  });
});