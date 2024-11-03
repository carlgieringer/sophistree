export function isPdfUrl(url: string) {
  const urlObj = new URL(url);
  return urlObj.pathname.toLowerCase().endsWith(".pdf");
}

export function makePdfViewerUrl(pdfUrl: string) {
  return `${viewerUrl()}?file=${encodeURIComponent(pdfUrl)}`;
}

export function isPdfViewerUrl(url: string) {
  return url.startsWith(viewerUrl());
}

export function getPdfUrlFromViewerUrl(url: string) {
  const urlObj = new URL(url);
  const pdfUrl = urlObj.searchParams.get("file");
  if (!pdfUrl) {
    throw new Error("Invalid PDF viewer URL");
  }
  return decodeURIComponent(pdfUrl);
}

export function makeCanonicalPdfUrl(pdfUrl: string) {
  const urlObject = new URL(pdfUrl);
  for (const key of urlObject.searchParams.keys()) {
    urlObject.searchParams.delete(key);
  }
  urlObject.hash = "";
  return urlObject.toString();
}

export const viewerPath = "pdfjs/web/viewer.html";

function viewerUrl() {
  return chrome.runtime.getURL(viewerPath);
}
