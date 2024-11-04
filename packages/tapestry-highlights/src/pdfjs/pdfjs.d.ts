export interface PDFViewer {
  scrollPageIntoView({ pageNumber }: { pageNumber: number }): void;
  currentPageNumber: number;
  currentPageLabel: string;
}

export interface PDFViewerApplication {
  initializedPromise: Promise<void>;
  metadata: Map<string, string>;
  pdfViewer: PDFViewer;
  eventBus: {
    on(event: string, callback: () => void): void;
  };
}

declare global {
  interface Window {
    PDFViewerApplication?: PDFViewerApplication;
  }
}
