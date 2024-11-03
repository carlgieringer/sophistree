/** Combines adjacent rects into one and drops rects completely encompassed by other rects. */
export function combineRects(rects: DOMRect[]): DOMRect[] {
  if (rects.length === 0) return [];

  // First, remove encompassed rects
  const nonEncompassedRects = removeEncompassedRects(rects);

  // Then, sort the remaining rects by top, then left
  const sortedRects = nonEncompassedRects.sort((a, b) =>
    a.top !== b.top ? a.top - b.top : a.left - b.left,
  );

  const combinedRects: DOMRect[] = [];
  let currentRect = sortedRects[0]!;

  for (let i = 1; i < sortedRects.length; i++) {
    const nextRect = sortedRects[i]!;

    // If the rects have the same top and height and are adjacent or overlapping
    if (
      currentRect.top === nextRect.top &&
      currentRect.height === nextRect.height &&
      nextRect.left <= currentRect.right + 1
    ) {
      // Combine the rects
      currentRect = new DOMRect(
        currentRect.left,
        currentRect.top,
        Math.max(nextRect.right - currentRect.left, currentRect.width),
        currentRect.height,
      );
    } else {
      // If they're not combinable, add the current rect to the result and move to the next
      combinedRects.push(currentRect);
      currentRect = nextRect;
    }
  }

  // Add the last rect
  combinedRects.push(currentRect);

  return combinedRects;
}

function removeEncompassedRects(rects: DOMRect[]): DOMRect[] {
  const len = rects.length;
  const isEncompassed = new Array(len).fill(false);
  const result: DOMRect[] = [];

  for (let i = 0; i < len; i++) {
    if (isEncompassed[i]) continue;

    const rect1 = rects[i]!;

    for (let j = i + 1; j < len; j++) {
      if (isEncompassed[j]) continue;

      const rect2 = rects[j]!;

      if (rectEncompasses(rect1, rect2)) {
        isEncompassed[j] = true;
      } else if (rectEncompasses(rect2, rect1)) {
        isEncompassed[i] = true;
        break;
      }
    }

    if (!isEncompassed[i]) {
      result.push(rect1);
    }
  }

  return result;
}

function rectEncompasses(a: DOMRect, b: DOMRect): boolean {
  return (
    a.left <= b.left &&
    a.right >= b.right &&
    a.top <= b.top &&
    a.bottom >= b.bottom
  );
}
