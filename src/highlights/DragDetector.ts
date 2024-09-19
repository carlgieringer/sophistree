// DragDetector.ts

export class DragDetector {
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private readonly dragThreshold: number = 5;
  private readonly container: HTMLElement;
  private readonly onDragStart: () => void;
  private readonly onDragEnd: () => void;

  constructor(container: HTMLElement, onDragStart: () => void, onDragEnd: () => void) {
    this.container = container;
    this.onDragStart = onDragStart;
    this.onDragEnd = onDragEnd;
    this.addEventListeners();
  }

  private addEventListeners() {
    this.container.addEventListener('mousedown', this.handleMouseDown);
  }

  private handleMouseDown = (event: MouseEvent) => {
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.isDragging) {
      const deltaX = Math.abs(event.clientX - this.dragStartX);
      const deltaY = Math.abs(event.clientY - this.dragStartY);
      if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
        this.isDragging = true;
        this.onDragStart();
      }
    }
  }

  private handleMouseUp = () => {
    if (this.isDragging) {
      this.isDragging = false;
      this.onDragEnd();
    }
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  public destroy() {
    this.container.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }
}
