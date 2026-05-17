export type LandingJudgeResult = "perfect" | "good" | "miss";

type AffineMatrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

type LandingEvaluationInput = {
  sceneElement: HTMLElement;
  towerElement: HTMLElement;
  currentBlockX: number;
  currentBlockWidth: number;
  supportBlockX: number;
  supportBlockWidth: number;
  nextBlockIndex: number;
  blockHeight: number;
  cameraOffset: number;
  perfectSnapToleranceRatio: number;
  missOverlapThreshold: number;
};

type LandingEvaluation = {
  result: LandingJudgeResult;
  overlapRatio: number;
  placedX: number;
};

const createTranslateMatrix = (tx: number, ty: number): AffineMatrix => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: tx,
  f: ty
});

const multiplyMatrices = (left: AffineMatrix, right: AffineMatrix): AffineMatrix => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f
});

const applyMatrixToPoint = (matrix: AffineMatrix, x: number, y: number) => ({
  x: matrix.a * x + matrix.c * y + matrix.e,
  y: matrix.b * x + matrix.d * y + matrix.f
});

const parseTransformOrigin = (transformOrigin: string) => {
  const [originX = "0", originY = "0"] = transformOrigin.split(" ");
  return {
    x: Number.parseFloat(originX) || 0,
    y: Number.parseFloat(originY) || 0
  };
};

const getCssTransformMatrix = (element: HTMLElement): AffineMatrix => {
  const transform = window.getComputedStyle(element).transform;

  if (!transform || transform === "none") {
    return createTranslateMatrix(0, 0);
  }

  const matrix = new DOMMatrixReadOnly(transform);
  return {
    a: matrix.a,
    b: matrix.b,
    c: matrix.c,
    d: matrix.d,
    e: matrix.e,
    f: matrix.f
  };
};

const getTowerWorldMatrix = (sceneElement: HTMLElement, towerElement: HTMLElement): AffineMatrix => {
  const sceneRect = sceneElement.getBoundingClientRect();
  const sceneContentLeft = sceneRect.left + sceneElement.clientLeft;
  const sceneContentTop = sceneRect.top + sceneElement.clientTop;
  const towerBoxLeft = sceneContentLeft + towerElement.offsetLeft;
  const towerBoxTop = sceneContentTop + towerElement.offsetTop;
  const transformMatrix = getCssTransformMatrix(towerElement);
  const transformOrigin = parseTransformOrigin(window.getComputedStyle(towerElement).transformOrigin);

  return multiplyMatrices(
    createTranslateMatrix(towerBoxLeft, towerBoxTop),
    multiplyMatrices(
      createTranslateMatrix(transformOrigin.x, transformOrigin.y),
      multiplyMatrices(transformMatrix, createTranslateMatrix(-transformOrigin.x, -transformOrigin.y))
    )
  );
};

const solveLocalXForWorldXAtLocalY = (
  matrix: AffineMatrix,
  worldX: number,
  localY: number
) => {
  if (Math.abs(matrix.a) < 1e-6) {
    return null;
  }

  return (worldX - matrix.c * localY - matrix.e) / matrix.a;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const evaluateLanding = ({
  sceneElement,
  towerElement,
  currentBlockX,
  currentBlockWidth,
  supportBlockX,
  supportBlockWidth,
  nextBlockIndex,
  blockHeight,
  cameraOffset,
  perfectSnapToleranceRatio,
  missOverlapThreshold
}: LandingEvaluationInput): LandingEvaluation | null => {
  const towerHeight = towerElement.offsetHeight;
  const localBottom = nextBlockIndex * blockHeight - cameraOffset;
  const localCenterY = towerHeight - localBottom - blockHeight / 2;
  const worldMatrix = getTowerWorldMatrix(sceneElement, towerElement);
  const sceneRect = sceneElement.getBoundingClientRect();
  const sceneContentLeft = sceneRect.left + sceneElement.clientLeft;
  const currentWorldCenterX = sceneContentLeft + currentBlockX + currentBlockWidth / 2;
  const currentLocalCenterX = solveLocalXForWorldXAtLocalY(worldMatrix, currentWorldCenterX, localCenterY);

  if (currentLocalCenterX === null) {
    return null;
  }

  const supportLocalCenterX = supportBlockX + supportBlockWidth / 2;
  const supportWorldCenter = applyMatrixToPoint(worldMatrix, supportLocalCenterX, localCenterY);
  const currentLocalLeft = currentLocalCenterX - currentBlockWidth / 2;
  const currentLocalRight = currentLocalLeft + currentBlockWidth;
  const supportLocalLeft = supportBlockX;
  const supportLocalRight = supportBlockX + supportBlockWidth;
  const overlapWidth = Math.max(
    0,
    Math.min(currentLocalRight, supportLocalRight) - Math.max(currentLocalLeft, supportLocalLeft)
  );
  const overlapRatio = clamp(overlapWidth / currentBlockWidth, 0, 1);
  const offsetRatio = Math.abs(currentWorldCenterX - supportWorldCenter.x) / currentBlockWidth;

  if (offsetRatio <= perfectSnapToleranceRatio) {
    return { result: "perfect", overlapRatio: 1, placedX: supportBlockX };
  }

  return {
    result: overlapRatio >= missOverlapThreshold ? "good" : "miss",
    overlapRatio,
    placedX: currentLocalLeft
  };
};
