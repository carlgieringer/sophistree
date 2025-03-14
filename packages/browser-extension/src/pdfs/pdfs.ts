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

export const viewerPath = "pdfjs/web/viewer.html";

function viewerUrl() {
  return chrome.runtime.getURL(viewerPath);
}
