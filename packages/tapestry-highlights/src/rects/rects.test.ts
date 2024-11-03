import { combineRects } from "./rects.ts";

class DOMRect {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public left: number;
  public top: number;
  public bottom: number;
  public right: number;
  constructor(x?: number, y?: number, width?: number, height?: number) {
    this.x = x ?? 0;
    this.y = y ?? 0;
    this.width = width ?? 0;
    this.height = height ?? 0;
    this.bottom = this.y + this.height;
    this.right = this.x + this.width;
    this.left = this.x;
    this.top = this.y;
  }
  toJSON() {
    throw new Error("Not implemented");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static fromRect(otherRect: DOMRect): DOMRect {
    throw new Error("Not implemented");
  }
}

globalThis.DOMRect = DOMRect;

declare global {
  interface Window {
    DOMRect: typeof DOMRect;
  }
}

describe("combineRects", () => {
  it("should return an empty array when given an empty array", () => {
    expect(combineRects([])).toEqual([]);
  });

  it("should return the same rect when given a single rect", () => {
    const rect = new DOMRect(0, 0, 100, 50);
    expect(combineRects([rect])).toEqual([rect]);
  });

  it("should combine adjacent rects with the same top and height", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(50, 0, 50, 50);
    const expected = [new DOMRect(0, 0, 100, 50)];
    expect(combineRects([rect1, rect2])).toEqual(expected);
  });

  it("should combine overlapping rects with the same top and height", () => {
    const rect1 = new DOMRect(0, 0, 60, 50);
    const rect2 = new DOMRect(50, 0, 60, 50);
    const expected = [new DOMRect(0, 0, 110, 50)];
    expect(combineRects([rect1, rect2])).toEqual(expected);
  });

  it("should not combine rects with different tops", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(0, 50, 50, 50);
    expect(combineRects([rect1, rect2])).toEqual([rect1, rect2]);
  });

  it("should not combine rects with different heights", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(50, 0, 50, 60);
    expect(combineRects([rect1, rect2])).toEqual([rect1, rect2]);
  });

  it("should drop rects completely encompassed by other rects", () => {
    const rect1 = new DOMRect(0, 0, 100, 100);
    const rect2 = new DOMRect(25, 25, 50, 50);
    expect(combineRects([rect1, rect2])).toEqual([rect1]);
  });

  it("should drop encompassed rects even with intervening rects", () => {
    const rect1 = new DOMRect(50, 0, 100, 50);
    // This rect should be sorted between rect1 and rect3 according to a strictly
    // top-first, left-second ordering. It tests checks whether our encompassing
    // logic works since it compares a currentRect to a nextRect.
    // Its top is between rect1 and rect3. It's left is left of both.
    const rect2 = new DOMRect(0, 1, 48, 50);
    const rect3 = new DOMRect(75, 25, 25, 25);
    expect(combineRects([rect1, rect2, rect3])).toEqual([rect1, rect2]);
  });

  it("should drop complicated encompassed rects typical of some PDFs", () => {
    const rect1 = new DOMRect(
      327.9765625,
      198.5859375,
      52.80389404296875,
      20.5,
    );
    const rect2 = new DOMRect(380.7734375, 200.0859375, 10.6015625, 17.6015625);
    const rect3 = new DOMRect(380.7734375, 198.5859375, 10.6015625, 20.5);
    const rect4 = new DOMRect(
      394.078125,
      200.0859375,
      21.12310791015625,
      17.6015625,
    );
    const rect5 = new DOMRect(394.078125, 198.5859375, 21.12310791015625, 20.5);
    const rect6 = new DOMRect(415.1953125, 200.0859375, 10.6015625, 17.6015625);
    const rect7 = new DOMRect(415.1953125, 198.5859375, 10.6015625, 20.5);
    const rect8 = new DOMRect(
      428.515625,
      198.5859375,
      42.246246337890625,
      20.5,
    );

    const combinedRects = combineRects([
      rect1,
      rect2,
      rect3,
      rect4,
      rect5,
      rect6,
      rect7,
      rect8,
    ]);

    const rect1to3 = new DOMRect(327.9765625, 198.5859375, 63.3984375, 20.5);
    const rect4to7 = new DOMRect(394.078125, 198.5859375, 31.71875, 20.5);
    expect(combinedRects).toEqual([rect1to3, rect4to7, rect8]);
  });

  it("should handle multiple combinations and drops", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(50, 0, 50, 50);
    const rect3 = new DOMRect(25, 25, 25, 25);
    const rect4 = new DOMRect(0, 50, 100, 50);
    const expected = [new DOMRect(0, 0, 100, 50), new DOMRect(0, 50, 100, 50)];
    expect(combineRects([rect1, rect2, rect3, rect4])).toEqual(expected);
  });

  it("should handle rects that are adjacent vertically but not combinable", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(0, 50, 60, 50);
    expect(combineRects([rect1, rect2])).toEqual([rect1, rect2]);
  });

  it("should combine multiple adjacent rects", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(50, 0, 50, 50);
    const rect3 = new DOMRect(100, 0, 50, 50);
    const expected = [new DOMRect(0, 0, 150, 50)];
    expect(combineRects([rect1, rect2, rect3])).toEqual(expected);
  });

  it("should handle rects with gaps between them", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(60, 0, 50, 50);
    expect(combineRects([rect1, rect2])).toEqual([rect1, rect2]);
  });

  it("should handle rects that are within 1px of each other", () => {
    const rect1 = new DOMRect(0, 0, 50, 50);
    const rect2 = new DOMRect(51, 0, 50, 50);
    const expected = [new DOMRect(0, 0, 101, 50)];
    expect(combineRects([rect1, rect2])).toEqual(expected);
  });

  it("should handle complex scenarios with multiple rects", () => {
    const rects = [
      new DOMRect(0, 0, 50, 50),
      new DOMRect(50, 0, 50, 50),
      new DOMRect(25, 25, 25, 25),
      new DOMRect(0, 50, 100, 50),
      new DOMRect(150, 0, 50, 100),
      new DOMRect(200, 0, 50, 100),
    ];
    const expected = [
      new DOMRect(0, 0, 100, 50),
      new DOMRect(150, 0, 100, 100),
      new DOMRect(0, 50, 100, 50),
    ];
    expect(combineRects(rects)).toEqual(expected);
  });
});
