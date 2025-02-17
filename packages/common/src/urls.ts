import { UrlInfo } from "./entities";

export function preferredUrl(urlInfo: UrlInfo): string {
  return urlInfo.canonicalUrl ?? urlInfo.url;
}

/** Whether the MediaExcerpt should be displayed on the page with the given UrlInfo. */
export function isMatchingUrlInfo(
  mediaExcerptUrlInfo: UrlInfo,
  pageUrlInfo: UrlInfo,
) {
  if (mediaExcerptUrlInfo.pdfFingerprint) {
    return mediaExcerptUrlInfo.pdfFingerprint === pageUrlInfo.pdfFingerprint;
  }
  if (mediaExcerptUrlInfo.canonicalUrl) {
    return mediaExcerptUrlInfo.canonicalUrl === pageUrlInfo.canonicalUrl;
  }
  return mediaExcerptUrlInfo.url === pageUrlInfo.url;
}

export function extractHostname(urlInfo: UrlInfo) {
  return new URL(preferredUrl(urlInfo)).hostname;
}
