const viewerUrl = chrome.runtime.getURL("pdfjs/web/viewer.html");

export function isPdfUrl(url: string) {
  const urlObj = new URL(url);
  return urlObj.pathname.toLowerCase().endsWith(".pdf");
}

export function makePdfViewerUrl(pdfUrl: string) {
  return `${viewerUrl}?file=${encodeURIComponent(pdfUrl)}`;
}

export function isPdfViewerUrl(url: string) {
  return url.startsWith(viewerUrl);
}

export function getPdfUrlFromViewerUrl(url: string) {
  const urlObj = new URL(url);
  const pdfUrl = urlObj.searchParams.get("file");
  if (!pdfUrl) {
    throw new Error("Invalid PDF viewer URL");
  }
  return decodeURIComponent(pdfUrl);
}
