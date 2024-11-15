import concurrently from "concurrently";
const { result } = concurrently(
  [
    {
      command: "npm run dev --workspace packages/backend",
      name: "backend",
    },
    {
      command: "npm run watch-all --workspace packages/browser-extension",
      name: "browser-extension",
    },
    {
      command: "npm run watch-all --workspace packages/tapestry-highlights",
      name: "tapestry-highlights",
    },
  ],
  {
    killOthers: ["failure", "success"],
  }
);
await result;
