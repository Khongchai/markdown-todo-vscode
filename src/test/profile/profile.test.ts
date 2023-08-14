import { readFileSync } from "fs";
import { DiagnosticsParser } from "../../parsingService/parser";

// todo...maybe
test("Profiling", () => {
  if (process.env.TEST_ENV !== "PROFILE") {
    return;
  }

  let fixture: string;

  try {
    fixture = readFileSync("./fixture.md", "utf8");
  } catch (e) {
    console.error("Cannot read fixture file");
    console.error(e);
    return;
  }

  console.log(fixture);

  const parser = new DiagnosticsParser({
    daySettings: {
      critical: 2,
      deadlineApproaching: 4,
    },
    today: new Date("2020-01-01"),
  });
});
