import { makeCanonicalPdfUrl } from "./pdfs";

describe("makeCanonicalPdfUrl", () => {
  it("should return the canonical URL for a given URL", () => {
    const url = "https://example.com/path/to/document.pdf#page=2?query=param";
    const canonicalUrl = makeCanonicalPdfUrl(url);
    expect(canonicalUrl).toBe("https://example.com/path/to/document.pdf");
  });
});
