import DateUtil from "../parsingService/dateUtils";
import {
  DateParsedEvent,
  DiagnosticsParser,
} from "../parsingService/parserExecutor";
import { DeadlineSection } from "../parsingService/todoSection";

// Modify this later when we have more visitors.
type Expected = Parameters<DateParsedEvent>;

// using mock deadline section to make sure that we sync the parameters with the real DateParsedEvent.
const mockDeadlineSection = (date: Date): DeadlineSection => {
  const mockedDeadlineSection: DeadlineSection = Object.create(
    DeadlineSection.prototype
  );
  mockedDeadlineSection.getDate = jest.fn(() => date);
  return mockedDeadlineSection;
};

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
  for (let i = 0; i < results.length; i++) {
    expect(results[i][0].getDate()).toStrictEqual(expecteds[i][0].getDate());
    expect(results[i][1]).toStrictEqual(expecteds[i][1]);
    expect(results[i][2]).toStrictEqual(expecteds[i][2]);
  }
}

describe("visitorsTest", () => {
  it("tests a single date", () => {
    const input = ["01/06/1997   ", "- [ ] Something"].join("\n");

    runTest(input, [
      [
        mockDeadlineSection(DateUtil.getDateLastMoment(1997, 6 - 1, 1, 23)),
        0,
        13,
      ],
    ]);
  });

  it("tests multiple dates", () => {
    const input = ["01/06/1997   ", "hello", "31/12/1997"].join("\n");

    runTest(input, [
      [
        mockDeadlineSection(DateUtil.getDateLastMoment(1997, 6 - 1, 1, 23)),
        0,
        13,
      ],
      [
        mockDeadlineSection(DateUtil.getDateLastMoment(1997, 12 - 1, 31, 23)),
        2,
        10,
      ],
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
