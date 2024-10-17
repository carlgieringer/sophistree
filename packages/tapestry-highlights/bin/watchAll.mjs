import concurrently from "concurrently";
const { result } = concurrently(
  [
    {
      command: "npm run build-watch",
      name: "ts",
    },
    {
      command: "npm run build-styles-watch",
      name: "styles",
    },
  ],
  {
    killOthers: ["failure", "success"],
  },
);
await result;
