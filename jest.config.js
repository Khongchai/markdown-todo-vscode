module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  testEnvironment: "node",
  moduleDirectories: ["node_modules", "src"],
  testMatch: ["**/?(*.)+(spec|test).[t]s?(x)"],
};
