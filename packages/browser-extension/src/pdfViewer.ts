import * as pdfjs from "pdfjs-dist";

import * as contentLogger from "./logging/contentLogging";
import { SophistreePdfApp } from "./pdfs/SophistreePdfApp";

pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs/build/pdf.worker.mjs";

const pdfApp = new SophistreePdfApp(getContainer());

const domContentLoaded = new Promise<void>((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    pdfApp.initViewer();
    resolve();
  });
});

const animationStarted = new Promise(function (resolve) {
  window.requestAnimationFrame(resolve);
});

Promise.all([domContentLoaded, animationStarted])
  .then(function () {
    const url = getPdfUrl();
    return pdfApp.open(url);
  })
  .catch((reason) => {
    contentLogger.error("Failed to initialize Sophistree PDF viewer.", reason);
  });

function getContainer() {
  const containerId = "pdf-viewer-container";
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Missing PDF viewer container #${containerId}`);
  }
  if (!(container instanceof HTMLDivElement)) {
    throw new Error(`PDF viewer container #${containerId} is not a div`);
  }
  return container;
}

function getPdfUrl() {
  const windowUrl = new URL(window.location.href);
  const url = windowUrl.searchParams.get("file");
  if (!url) {
    throw new Error("Curent page URL is missing PDF file query param.");
  }
  return url;
}
