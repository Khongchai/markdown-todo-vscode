import { DiagnosticsParser } from "../parsingService/parser";
import DateUtil from "../parsingService/utils";

function createAssertion(
  expectedDate: Date,
  expectedLine: number,
  expectedLineEnd: number
) {
  let isCalled = false;
  return {
    assert: (date: Date, line: number, lineEnd: number) => {
      isCalled = true;
      expect(date).toStrictEqual(expectedDate);
      expect(line).toBe(expectedLine);
      expect(lineEnd).toBe(expectedLineEnd);
    },
    assertCalled: () => expect(isCalled).toBe(true),
  };
}

// Refactor to handle list assertion when the need arise.
function runTest(input: string, assertion: ReturnType<typeof createAssertion>) {
  const parser = new DiagnosticsParser({
    visitors: [
      {
        onNewLineAtDate: assertion.assert,
      },
    ],
  });
  parser.parse(input);

  assertion.assertCalled();
}

describe("Visitor arguments test", () => {
  it("onNewLineAtDate", () => {
    const input = ["01/06/1997   ", "hello"].join("\n");

    runTest(
      input,
      createAssertion(DateUtil.getDateLikeNormalPeople(1997, 6, 1), 0, 13)
    );
  });
});

describe("Decoration visitor test", () => {});
