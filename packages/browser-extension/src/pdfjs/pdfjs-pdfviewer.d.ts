declare module "pdfjs-dist/web/pdf_viewer" {
  import { PDFDocumentProxy } from "pdfjs-dist";
  export class PDFViewer {
    constructor(options: PDFViewerOptions);

    container: HTMLDivElement;
    viewer: HTMLDivElement;
    eventBus: EventBus;
    linkService: PDFLinkService;
    downloadManager: DownloadManager | null;
    findController: PDFFindController | null;

    get pagesCount(): number;
    get pageViewsReady(): boolean;
    get currentPageNumber(): number;
    set currentPageNumber(val: number);
    get currentPageLabel(): string | null;
    set currentPageLabel(val: string | null);
    get currentScale(): number;
    set currentScale(val: number);
    get currentScaleValue(): string;
    set currentScaleValue(val: string);
    get pagesRotation(): number;
    set pagesRotation(rotation: number);
    get firstPagePromise(): Promise<PDFPageView> | null;
    get onePageRendered(): Promise<PDFPageView> | null;
    get pagesPromise(): Promise<PDFPageView[]> | null;

    setDocument(pdfDocument: PDFDocumentProxy | null): void;
    setPageLabels(labels: string[] | null): void;
    pageLabelToPageNumber(label: string): number | null;
    scrollPageIntoView(params: {
      pageNumber: number;
      destArray?: Array<unknown>;
      allowNegativeOffset?: boolean;
      ignoreDestinationZoom?: boolean;
    }): void;
    update(): void;
    containsElement(element: HTMLElement): boolean;
    focus(): void;

    get isInPresentationMode(): boolean;
    get isChangingPresentationMode(): boolean;
    get isHorizontalScrollbarEnabled(): boolean;
    get isVerticalScrollbarEnabled(): boolean;

    cleanup(): void;
    forceRendering(currentlyVisiblePages?: object): boolean;
    getPageView(index: number): PDFPageView;
    getCachedPageViews(): Set<PDFPageView>;
    getVisiblePages(): object;

    get hasEqualPageSizes(): boolean;
    getPagesOverview(): object[];

    get optionalContentConfigPromise(): Promise<object> | null;
    set optionalContentConfigPromise(promise: Promise<object>);

    get scrollMode(): number;
    set scrollMode(mode: number);
    get spreadMode(): number;
    set spreadMode(mode: number);

    nextPage(): boolean;
    previousPage(): boolean;

    updateScale(options: {
      drawingDelay?: number;
      scaleFactor?: number;
      steps?: number;
      origin?: Array<number>;
    }): void;
    increaseScale(options?: { steps?: number }): void;
    decreaseScale(options?: { steps?: number }): void;

    get annotationEditorMode(): number;
    set annotationEditorMode(options: {
      mode: number;
      editId?: string | null;
      isFromKeyboard?: boolean;
    });

    refresh(noUpdate?: boolean, updateArgs?: object): void;
  }

  export interface PDFViewerOptions {
    container: HTMLDivElement;
    viewer?: HTMLDivElement;
    eventBus: EventBus;
    linkService?: LinkService;
    downloadManager?: DownloadManager;
    findController?: PDFFindController;
    enableWebGL?: boolean;
    textLayerMode?: 0 | 1 | 2;
    renderer?: 'canvas';
  }

  export class DownloadManager {
    downloadUrl(url: string, filename: string): void;
    downloadData(data: Uint8Array, filename: string, contentType: string): void;
  }

  export class EventBus {
    on(eventName: string, listener: EventBusListener<?>): void;
    off(eventName: string, listener: EventBusListener<?>): void;
    dispatch(eventName: string, data?: unknown): void;
  }

  export type EventBusListener<D> = (data: D) => void;

  export enum FindState {
    FOUND,
    NOT_FOUND,
    WRAPPED,
    PENDING,
  }

  export class GenericL10n {
    constructor(lang?: string);
    translate(element: HTMLElement): void;
    get(key: string, args?: unknown): Promise<string>;
  }

  export enum LinkTarget {
    NONE,
    SELF,
    BLANK,
    PARENT,
    TOP,
  }

  export interface PageChangeEvent {
    pageNumber: number;
  }

  export class PDFFindController {
    constructor(options: unknown);
    executeCommand(cmd: string, state: unknown): void;
  }

  export class PDFHistory {
    constructor(options: unknown);
    initialize(fingerprint: string): void;
    push(params: unknown): void;
  }

  export class PDFLinkService {
    constructor(options?: unknown);
    setDocument(pdfDocument: unknown): void;
    setViewer(pdfViewer: PDFViewer): void;
    setHistory(pdfHistory: PDFHistory): void;
  }

  export class PDFPageView {
    constructor(options: unknown);
    setPdfPage(pdfPage: unknown): void;
    destroy(): void;
  }

  export class PDFScriptingManager {
    constructor(options: unknown);
    setDocument(pdfDocument: unknown): Promise<void>;
  }

  export class PDFSinglePageViewer extends PDFViewer {
    constructor(options: unknown);
  }

  export class ProgressBar {
    constructor(id: string, opts?: unknown);
    percent: number;
    visible: boolean;
    hide(): void;
    show(): void;
  }

  export enum RenderingStates {
    INITIAL,
    RUNNING,
    PAUSED,
    FINISHED,
  }

  export enum ScrollMode {
    VERTICAL,
    HORIZONTAL,
    WRAPPED,
  }

  export class SimpleLinkService extends PDFLinkService {}

  export enum SpreadMode {
    NONE,
    ODD,
    EVEN,
  }

  export class StructTreeLayerBuilder {
    constructor(options: unknown);
    render(structTree: unknown): void;
  }

  export class TextLayerBuilder {
    constructor(options: unknown);
    render(timeout?: number): Promise<void>;
  }

  export class XfaLayerBuilder {
    constructor(options: unknown);
    render(viewport: unknown, intent?: string): Promise<void>;
  }

  export function parseQueryString(query: string): Map<string, string>;
}
