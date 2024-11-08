declare global {
  interface Window {
    PDFViewerApplication?: PDFViewerApplication;
  }
}

export interface PDFViewerApplication {
  initializedPromise: Promise<void>;
  metadata?: Map<string, string>;
  pdfDocument: PDFDocumentProxy;
  pdfViewer: PDFViewer;
  eventBus: {
    on(event: string, callback: () => void): void;
  };
}

export interface PDFDocumentProxy {
  fingerprints: string[];
}

export interface PDFViewer {
  scrollPageIntoView({ pageNumber }: { pageNumber: number }): void;
  currentPageNumber: number;
  currentPageLabel: string;
  container: HTMLDivElement;
}
