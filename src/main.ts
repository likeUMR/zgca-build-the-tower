import "./styles.css";
import { buildingConfig, progressNodes, winLevel, type BuildingConfigItem } from "./buildingConfig";
import { getBuildingIntro } from "./buildingIntroConfig";
import { evaluateLanding } from "./landingEngine";

type JudgeResult = "perfect" | "good" | "miss";
type DropMode = "hanging" | "falling";

type TowerBlock = {
  id: number;
  x: number;
  width: number;
  label: string;
  themeId: string;
  judge: JudgeResult;
  overlapRatio: number;
};

type CraneRig = {
  ropeAngle: number;
  ropeLength: number;
};

type CurrentBlock = {
  id: number;
  x: number;
  width: number;
  label: string;
  themeId: string;
  mode: DropMode;
  y: number;
  releaseRig?: CraneRig;
};

type GameState = {
  towerBlocks: TowerBlock[];
  currentBlock: CurrentBlock;
  height: number;
  capacity: number;
  bestCapacity: number;
  missCount: number;
  stability: number;
  perfectCombo: number;
  feverValue: number;
  isFeverActive: boolean;
  unlockedLevels: number[];
  selectedLevel: number;
  currentThemeId: string;
  isWon: boolean;
  isGameOver: boolean;
  lastJudge: JudgeResult | null;
  lastCapacityGain: number;
  lastGainUsedFever: boolean;
};

type RemoteClearState = "idle" | "loading" | "cleared" | "not-cleared" | "syncing" | "error";

type PlayerContext = {
  userId: string | null;
  clearState: RemoteClearState;
  clearedAt: string | null;
  rank: number | null;
};

type AdmissionGameStatus = {
  cleared: boolean;
  cleared_at: string | null;
  rank: number | null;
};

type AdmissionRegisterClearResponse = {
  game_status: AdmissionGameStatus;
};

const designWidth = 440;
const shellHorizontalPadding = 16;
const sceneWidth = designWidth - shellHorizontalPadding * 2;
const sceneHeight = 620;
const blockSize = 78;
const blockHeight = blockSize;
const maxMissCount = 3;
const perfectSnapToleranceRatio = 0.1;
const missOverlapThreshold = 0.29;
const feverMaxValue = 100;
const baseCraneSwingSpeed = 0.0015;
const craneSwingSpeedMultiplier = 1.5;
const feverBaseDecayPerSecond = 25;
const feverScoreMultiplier = 1.5;
const difficultyRampExponent = 1.6;
const initialDifficultyScale = 0.75;
const finalDifficultyScale = 0.5;
const initialFeverDecayScale = 0.75;
const towerStackBottom = 74;
const fixedBottomVisibleBlocks = 3;
const cameraTrackingOverflowPadding = towerStackBottom;
const pendulumPivotX = sceneWidth / 2;
const pendulumPivotY = 35;
const pendulumLength = 158;
const baseTowerSwaySpeed = 0.002;
const towerSwayAmplitudeMultiplier = 5;
const towerNoSwayHeightThreshold = 4;
const baseFallSpeed = 520;
const fallSpeedPerHeight = 10;
const fallSpeedMultiplier = 1.5;
const craneSwingSpeedMaxBonus = winLevel * 0.00004;
const craneMaxAngleMaxBonus = winLevel * 0.008;
const fallSpeedMaxBonus = winLevel * fallSpeedPerHeight;
const towerSwaySpeedMaxBonus = 0.0016;
const admissionApi = {
  baseUrl: "https://leaderboard.liruochen.cn",
  campaignId: "zgca-admission",
  gameId: "zgca-build-the-tower"
};
const admissionApiTimeoutMs = 10_000;
const storageKeys = {
  bestCapacity: "zgca-tower-best-capacity",
  unlockedLevels: "zgca-tower-unlocked-levels",
  baseProgress: "zgca-tower-base-progress",
  tutorialSeen: "zgca-tower-tutorial-seen"
};

const resolveAudioAssetPath = (fileName: string) => `${import.meta.env.BASE_URL}audio/${fileName}`;

const audioAssetPaths = {
  bgmGameplayMain: resolveAudioAssetPath("bgm-gameplay-main.mp3"),
  jingleVictory: resolveAudioAssetPath("jingle-victory.mp3"),
  jingleFail: resolveAudioAssetPath("jingle-fail.mp3"),
  uiButtonTap: resolveAudioAssetPath("ui-button-tap.mp3"),
  uiPopupOpen: resolveAudioAssetPath("ui-popup-open.mp3"),
  gameBlockRelease: resolveAudioAssetPath("game-block-release.mp3"),
  gameBlockLandGood: resolveAudioAssetPath("game-block-land-perfect.mp3"),
  gameBlockLandPerfect: resolveAudioAssetPath("game-block-land-good.mp3"),
  gameBlockMissFall: resolveAudioAssetPath("game-block-miss-fall.mp3"),
  gameUnlockStage: resolveAudioAssetPath("game-unlock-stage.mp3"),
  gameFeverActivate: resolveAudioAssetPath("game-fever-activate.mp3"),
  gameScoreBonus: resolveAudioAssetPath("game-score-bonus.mp3")
} as const;

type AudioKey = keyof typeof audioAssetPaths;

const audioVolumes: Record<AudioKey, number> = {
  bgmGameplayMain: 0.34,
  jingleVictory: 0.72,
  jingleFail: 0.64,
  uiButtonTap: 0.62,
  uiPopupOpen: 0.58,
  gameBlockRelease: 0.66,
  gameBlockLandGood: 0.72,
  gameBlockLandPerfect: 0.8,
  gameBlockMissFall: 0.78,
  gameUnlockStage: 0.72,
  gameFeverActivate: 0.8,
  gameScoreBonus: 0.62
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found.");
}

const root = app;
const searchParams = new URLSearchParams(window.location.search);
const debugAutoplay = searchParams.get("autoplay") === "1";
const debugAutoplayTarget = Math.max(1, Number(searchParams.get("autoplayTarget") ?? "9"));

let nextBlockId = 1;
let tutorialOpen = debugAutoplay ? false : localStorage.getItem(storageKeys.tutorialSeen) !== "true";
let animationFrameId = 0;
let lastFrameTime = performance.now();
let remoteClearRequestToken = 0;
let cameraOffset = 0;
let sceneVisualHeight = 0;
let towerSwayPhase = 0;
let gameplayBgm: HTMLAudioElement | null = null;
const oneshotAudioTemplates = new Map<AudioKey, HTMLAudioElement>();

const createAudioElement = (key: AudioKey, loop = false) => {
  const audio = new Audio(audioAssetPaths[key]);
  audio.preload = "auto";
  audio.loop = loop;
  audio.volume = audioVolumes[key];
  return audio;
};

const getGameplayBgm = () => {
  if (!gameplayBgm) {
    gameplayBgm = createAudioElement("bgmGameplayMain", true);
  }

  return gameplayBgm;
};

const playGameplayBgm = () => {
  if (tutorialOpen || state.isWon || state.isGameOver) {
    return;
  }

  const bgm = getGameplayBgm();

  if (!bgm.paused) {
    return;
  }

  void bgm.play().catch(() => {});
};

const stopGameplayBgm = () => {
  if (!gameplayBgm) {
    return;
  }

  gameplayBgm.pause();
  gameplayBgm.currentTime = 0;
};

const playAudio = (key: Exclude<AudioKey, "bgmGameplayMain">) => {
  const template =
    oneshotAudioTemplates.get(key) ??
    (() => {
      const audio = createAudioElement(key);
      oneshotAudioTemplates.set(key, audio);
      return audio;
    })();

  const instance = template.cloneNode(true) as HTMLAudioElement;
  instance.volume = audioVolumes[key];
  void instance.play().catch(() => {});
};

const getUserIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const supportedKeys = ["user_id", "userId", "uid"];

  for (const key of supportedKeys) {
    const value = params.get(key)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
};

let playerContext: PlayerContext = {
  userId: getUserIdFromUrl(),
  clearState: "idle",
  clearedAt: null,
  rank: null
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character] ?? character
  );

const getStoredBestCapacity = () => Number(localStorage.getItem(storageKeys.bestCapacity) ?? "0");

const getStoredUnlockedLevels = () => {
  const raw = localStorage.getItem(storageKeys.unlockedLevels);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "number") : [];
  } catch {
    return [];
  }
};

const maxBaseProgressStep = Math.max(0, progressNodes.length - 1);

const getStoredBaseProgressStep = () => {
  const raw = Number(localStorage.getItem(storageKeys.baseProgress) ?? "0");

  if (!Number.isFinite(raw)) {
    return 0;
  }

  return Math.max(0, Math.min(maxBaseProgressStep, Math.floor(raw)));
};

const getBuildingByLevel = (level: number) =>
  buildingConfig.find((item) => item.level === level);

const getBuildingByTheme = (themeId: string) =>
  buildingConfig.find((item) => item.theme.id === themeId) ?? progressNodes[0];

const getLatestUnlockedProgressLevel = (levels: number[]) => {
  const sorted = progressNodes
    .filter((item) => levels.includes(item.level))
    .sort((a, b) => b.heightRequired - a.heightRequired);

  return sorted[0]?.level ?? progressNodes[0].level;
};

const getProgressStepForHeight = (height: number) =>
  progressNodes.filter((item) => height >= item.heightRequired).length;

const getHeightForBaseProgressStep = (baseProgressStep: number) => {
  if (baseProgressStep <= 0) {
    return 0;
  }

  return progressNodes[Math.min(baseProgressStep, progressNodes.length) - 1]?.heightRequired ?? 0;
};

const getStageForHeight = (height: number) => {
  const normalizedHeight = Math.max(1, height);
  const sorted = [...progressNodes].sort((a, b) => b.heightRequired - a.heightRequired);
  return sorted.find((item) => normalizedHeight >= item.heightRequired) ?? progressNodes[0];
};

const getUnlockedFromHeight = (height: number, currentLevels: number[]) => {
  const nextLevels = new Set(currentLevels);

  for (const building of progressNodes) {
    if (height >= building.heightRequired) {
      nextLevels.add(building.level);
    }
  }

  return [...nextLevels].sort((a, b) => a - b);
};

const getNewlyUnlockedLevel = (previousLevels: number[], nextLevels: number[]) => {
  const newlyUnlocked = nextLevels
    .filter((level) => !previousLevels.includes(level))
    .sort((a, b) => {
      const aBuilding = getBuildingByLevel(a);
      const bBuilding = getBuildingByLevel(b);
      return (bBuilding?.heightRequired ?? 0) - (aBuilding?.heightRequired ?? 0);
    });

  return newlyUnlocked[0];
};

const getUpdatedBaseProgressStep = (height: number) => {
  const previousBaseProgressStep = getStoredBaseProgressStep();
  const finalProgressStep = getProgressStepForHeight(height);
  const gainedProgress = Math.floor((finalProgressStep - previousBaseProgressStep) / 2);

  return Math.max(
    previousBaseProgressStep,
    Math.min(maxBaseProgressStep, previousBaseProgressStep + Math.max(0, gainedProgress))
  );
};

const getNextMilestoneLabel = (height: number) => {
  const nextMilestone = progressNodes.find((item) => item.heightRequired === height + 1);
  return nextMilestone?.icon ?? "学院模块";
};

const getCurrentSwingAngle = (time: number) => {
  const speed = getCraneSwingSpeed();
  const maxAngle = Math.min(
    0.92,
    (0.42 + craneMaxAngleMaxBonus * getDifficultyRamp() + (100 - getStateStability()) * 0.0016) *
      getDifficultyScale()
  );
  return Math.sin(time * speed) * maxAngle;
};

const getSwingBlockPosition = (time: number, width: number) => {
  const ropeAngle = getCurrentSwingAngle(time);
  const craneLift = getCraneLift();
  const x = pendulumPivotX + Math.sin(ropeAngle) * pendulumLength - width / 2;
  const y = pendulumPivotY - craneLift + Math.cos(ropeAngle) * pendulumLength - blockHeight / 2;

  return {
    x: Math.max(12, Math.min(sceneWidth - width - 12, x)),
    y
  };
};

const createCurrentBlock = (height: number, time = lastFrameTime): CurrentBlock => {
  const stage = getStageForHeight(height + 1);
  const width = blockSize;
  const position = getSwingBlockPosition(time, width);

  return {
    id: nextBlockId++,
    x: position.x,
    width,
    label: getNextMilestoneLabel(height),
    themeId: stage.theme.id,
    mode: "hanging",
    y: position.y
  };
};

const initialStability = 86;

const createBaseTowerBlocks = (height: number): TowerBlock[] => {
  const centeredX = (sceneWidth - blockSize) / 2;

  return Array.from({ length: height }, (_, index) => {
    const floor = index + 1;

    return {
      id: nextBlockId++,
      x: centeredX,
      width: blockSize,
      label: getNextMilestoneLabel(index),
      themeId: getStageForHeight(floor).theme.id,
      judge: "perfect",
      overlapRatio: 1
    };
  });
};

const getCameraTargetOffsetForHeight = (height: number) => {
  const towerHeight = height * blockHeight;
  const overflowHeight = Math.max(0, towerHeight - blockHeight * fixedBottomVisibleBlocks);
  return overflowHeight > 0 ? overflowHeight + cameraTrackingOverflowPadding : 0;
};

const createInitialState = (): GameState => {
  const initialTowerHeight = getHeightForBaseProgressStep(getStoredBaseProgressStep());
  const storedUnlocked = getStoredUnlockedLevels();
  const unlockedLevels = getUnlockedFromHeight(initialTowerHeight, storedUnlocked);
  const selectedLevel = getLatestUnlockedProgressLevel(unlockedLevels);
  const currentStage = getStageForHeight(initialTowerHeight + 1);

  return {
    towerBlocks: createBaseTowerBlocks(initialTowerHeight),
    currentBlock: createCurrentBlock(initialTowerHeight),
    height: initialTowerHeight,
    capacity: 0,
    bestCapacity: getStoredBestCapacity(),
    missCount: 0,
    stability: initialStability,
    perfectCombo: 0,
    feverValue: 0,
    isFeverActive: false,
    unlockedLevels,
    selectedLevel,
    currentThemeId: currentStage.theme.id,
    isWon: false,
    isGameOver: false,
    lastJudge: null,
    lastCapacityGain: 0,
    lastGainUsedFever: false
  };
};

let state: GameState;

const persistProgress = (nextState: GameState) => {
  localStorage.setItem(storageKeys.bestCapacity, String(nextState.bestCapacity));
  localStorage.setItem(storageKeys.unlockedLevels, JSON.stringify(nextState.unlockedLevels));
  localStorage.setItem(storageKeys.baseProgress, String(getStoredBaseProgressStep()));
};

const callAdmissionApi = async <ResponseBody>(
  path: "/api/admission/game_status" | "/api/admission/register_clear"
) => {
  if (!playerContext.userId) {
    throw new Error("Missing user id.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), admissionApiTimeoutMs);

  const response = await fetch(`${admissionApi.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      campaign_id: admissionApi.campaignId,
      game_id: admissionApi.gameId,
      user_id: playerContext.userId
    }),
    signal: controller.signal
  }).finally(() => {
    window.clearTimeout(timeoutId);
  });

  if (!response.ok) {
    throw new Error(`Admission API request failed: ${response.status}`);
  }

  return (await response.json()) as ResponseBody;
};

const updateRemoteClearStatus = (gameStatus: AdmissionGameStatus) => {
  playerContext = {
    ...playerContext,
    clearState: gameStatus.cleared ? "cleared" : "not-cleared",
    clearedAt: gameStatus.cleared_at,
    rank: gameStatus.rank
  };
};

const fetchRemoteClearStatus = async () => {
  if (!playerContext.userId) {
    return;
  }

  const requestToken = ++remoteClearRequestToken;
  playerContext = {
    ...playerContext,
    clearState: "loading"
  };
  render();

  try {
    const gameStatus = await callAdmissionApi<AdmissionGameStatus>("/api/admission/game_status");
    if (requestToken !== remoteClearRequestToken) {
      return;
    }
    updateRemoteClearStatus(gameStatus);
  } catch (error) {
    console.error(error);
    if (requestToken !== remoteClearRequestToken) {
      return;
    }
    playerContext = {
      ...playerContext,
      clearState: "error"
    };
  }

  render();
};

const registerRemoteClear = async () => {
  if (!playerContext.userId || playerContext.clearState === "syncing") {
    return;
  }

  const requestToken = ++remoteClearRequestToken;
  playerContext = {
    ...playerContext,
    clearState: "syncing"
  };
  render();

  try {
    const result = await callAdmissionApi<AdmissionRegisterClearResponse>(
      "/api/admission/register_clear"
    );
    if (requestToken !== remoteClearRequestToken) {
      return;
    }
    updateRemoteClearStatus(result.game_status);
  } catch (error) {
    console.error(error);
    if (requestToken !== remoteClearRequestToken) {
      return;
    }
    playerContext = {
      ...playerContext,
      clearState: "error"
    };
  }

  render();
};

const updateViewportScale = () => {
  const portraitRatio = window.innerHeight / window.innerWidth;
  const shouldScale = portraitRatio >= 1.25;
  const scale = shouldScale ? window.innerWidth / designWidth : 1;
  const tutorialScale = shouldScale ? Math.max(1, scale) : 1;
  const gameShell = document.querySelector<HTMLElement>(".game-shell");
  const scaledContentHeight = gameShell ? gameShell.scrollHeight * scale : window.innerHeight;

  document.documentElement.style.setProperty("--mobile-scale", String(scale));
  document.documentElement.style.setProperty("--tutorial-scale", String(tutorialScale));
  document.documentElement.style.setProperty("--scaled-content-height", `${scaledContentHeight}px`);
  document.documentElement.classList.toggle("is-mobile-scale", shouldScale);
};

const formatApiTime = (value: string) => {
  let parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    parsed = new Date(value.replace(" ", "T") + "Z");
  }

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getRemoteClearText = () => {
  if (playerContext.clearState === "loading") {
    return "通关状态查询中";
  }

  if (playerContext.clearState === "syncing") {
    return "通关状态登记中";
  }

  if (playerContext.clearState === "cleared") {
    const rankText = playerContext.rank ? ` · 单项第 ${playerContext.rank} 名` : "";
    return `已登记通关${rankText}`;
  }

  if (playerContext.clearState === "error") {
    return "状态同步失败";
  }

  return "暂未通关";
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

const parseHexColor = (value: string): RgbColor => {
  const normalized = value.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;

  if (!/^[\da-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Unsupported color format: ${value}`);
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16)
  };
};

const toHexByte = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");

const mixHexColor = (fromColor: string, toColor: string, progress: number) => {
  const from = parseHexColor(fromColor);
  const to = parseHexColor(toColor);
  const ratio = Math.min(1, Math.max(0, progress));
  return `#${toHexByte(from.r + (to.r - from.r) * ratio)}${toHexByte(from.g + (to.g - from.g) * ratio)}${toHexByte(from.b + (to.b - from.b) * ratio)}`;
};

const getThemeBlendForHeight = (height: number) => {
  const sortedNodes = [...progressNodes].sort((a, b) => a.heightRequired - b.heightRequired);
  const normalizedHeight = Math.max(0, height);

  if (sortedNodes.length <= 1 || normalizedHeight <= sortedNodes[0].heightRequired) {
    const node = sortedNodes[0];
    return {
      fromNode: node,
      toNode: node,
      progress: 0
    };
  }

  for (let index = 0; index < sortedNodes.length - 1; index += 1) {
    const fromNode = sortedNodes[index];
    const toNode = sortedNodes[index + 1];

    if (normalizedHeight <= toNode.heightRequired) {
      const range = toNode.heightRequired - fromNode.heightRequired;
      const progress = range <= 0 ? 1 : (normalizedHeight - fromNode.heightRequired) / range;
      return {
        fromNode,
        toNode,
        progress: Math.min(1, Math.max(0, progress))
      };
    }
  }

  const lastNode = sortedNodes[sortedNodes.length - 1];
  return {
    fromNode: lastNode,
    toNode: lastNode,
    progress: 1
  };
};

const getInterpolatedThemeColors = (height: number) => {
  const { fromNode, toNode, progress } = getThemeBlendForHeight(height);
  return {
    backgroundColor: mixHexColor(
      fromNode.theme.backgroundGradient,
      toNode.theme.backgroundGradient,
      progress
    ),
    accentColor: mixHexColor(fromNode.theme.accentColor, toNode.theme.accentColor, progress)
  };
};

const getThemeCssText = (height = sceneVisualHeight) => {
  const stage = getBuildingByTheme(state.currentThemeId);
  const { backgroundColor, accentColor } = getInterpolatedThemeColors(height);
  return [
    `--stage-bg: ${backgroundColor}`,
    `--stage-accent: ${accentColor}`,
    `--stage-glow: ${stage.theme.glowColor}`,
    `--shell-bg-top: ${mixHexColor(backgroundColor, "#ffffff", 0.7)}`,
    `--shell-bg-bottom: ${mixHexColor(backgroundColor, accentColor, 0.14)}`,
    `--scene-bg-top: ${mixHexColor(backgroundColor, "#ffffff", 0.82)}`,
    `--scene-bg-mid: ${mixHexColor(backgroundColor, accentColor, 0.1)}`,
    `--scene-bg-bottom: ${mixHexColor(backgroundColor, accentColor, 0.3)}`
  ].join("; ");
};

const getBlockThemeStyle = (themeId: string) => {
  const stage = getBuildingByTheme(themeId);
  return `background: ${stage.theme.blockGradient}; --block-glow: ${stage.theme.glowColor};`;
};

const getCameraTargetOffset = () => {
  return getCameraTargetOffsetForHeight(state.towerBlocks.length);
};

const getRecentTopLinkOverlapRatios = () =>
  state.towerBlocks.slice(-3).map((block) => block.overlapRatio);

const getTowerSway = () => {
  if (state.height <= towerNoSwayHeightThreshold) {
    return 0;
  }

  const recentOverlapRatios = getRecentTopLinkOverlapRatios();

  if (recentOverlapRatios.length === 0) {
    return 1.5 * towerSwayAmplitudeMultiplier;
  }

  const averageGapRatio =
    recentOverlapRatios.reduce((sum, ratio) => sum + (1 - ratio), 0) / recentOverlapRatios.length;
  return clamp(1.5 + averageGapRatio * 30, 1.5, 24) * towerSwayAmplitudeMultiplier;
};

const getDropTargetY = () => {
  const nextBlockIndex = state.towerBlocks.length;
  const visibleBottom = nextBlockIndex * blockHeight - cameraOffset;
  return sceneHeight - towerStackBottom - visibleBottom - blockHeight;
};

const getCurrentStageName = () => getBuildingByTheme(state.currentThemeId).name;

const getNextProgressNode = () =>
  progressNodes.find((item) => item.heightRequired > state.height) ?? progressNodes[progressNodes.length - 1];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getStageGuideBottom = (offset = cameraOffset) => {
  const nextNode = getNextProgressNode();
  const targetBottom = nextNode.heightRequired * blockHeight - offset;
  return clamp(targetBottom + 62, 120, sceneHeight - 116);
};

// The crane is treated like a camera HUD element: it stays pinned to the top
// while the tower and landing area scroll under it.
const getCraneLift = () => 0;

const getCraneOffset = () => 0;

const getStateHeight = () => state?.height ?? getHeightForBaseProgressStep(getStoredBaseProgressStep());

const getStateStability = () => state?.stability ?? initialStability;

// Difficulty ramps against build progress so the early game stays readable
// and the game only reaches full pressure at completion.
const getDifficultyProgress = () => clamp(getStateHeight() / winLevel, 0, 1);

const getDifficultyRamp = () => Math.pow(getDifficultyProgress(), difficultyRampExponent);

const getDifficultyScale = () =>
  initialDifficultyScale +
  (finalDifficultyScale - initialDifficultyScale) * getDifficultyProgress();

const getFeverDecayScale = () =>
  initialFeverDecayScale + (1 - initialFeverDecayScale) * getDifficultyProgress();

const getTowerSwaySpeed = () =>
  (baseTowerSwaySpeed + towerSwaySpeedMaxBonus * getDifficultyRamp()) * getDifficultyScale();

const getTowerSwayTransform = () => {
  const sway = Math.sin(towerSwayPhase) * getTowerSway();
  return `translateX(${sway}px) rotate(${sway / 28}deg)`;
};

const getCraneSwingSpeed = () =>
  (baseCraneSwingSpeed +
    craneSwingSpeedMaxBonus * getDifficultyRamp() +
    (100 - getStateStability()) * 0.000003) *
  getDifficultyScale() *
  craneSwingSpeedMultiplier;

const getBlockFallSpeed = () =>
  (baseFallSpeed + fallSpeedMaxBonus * getDifficultyRamp()) *
  getDifficultyScale() *
  fallSpeedMultiplier;

const getFeverDecayPerSecond = () =>
  feverBaseDecayPerSecond *
  (getCraneSwingSpeed() / baseCraneSwingSpeed) *
  getFeverDecayScale();

state = createInitialState();
cameraOffset = getCameraTargetOffsetForHeight(state.height);
sceneVisualHeight = state.height;

const getSwingCraneRig = (time: number): CraneRig => {
  const ropeAngle = getCurrentSwingAngle(time);
  const craneLift = getCraneLift();
  return {
    ropeAngle,
    ropeLength: pendulumLength + craneLift
  };
};

const getActiveCraneRig = () => getSwingCraneRig(lastFrameTime);

const getFeverRatio = () => clamp(state.feverValue / feverMaxValue, 0, 1);

const getFeverPercent = () => Math.round(getFeverRatio() * 100);

const getFeverLabel = () => (state.isFeverActive ? "激活中 +50%" : "等待 Perfect");

const calculateCapacityGain = (
  overlapRatio: number,
  nextHeight: number,
  perfectCombo: number,
  isFeverActive: boolean
) => {
  const baseCapacity = 20 + nextHeight * 2;
  const overlapMultiplier = 0.6 + overlapRatio * 0.8;
  const perfectBonus = perfectCombo * 5;
  const totalCapacity = baseCapacity * overlapMultiplier + perfectBonus;
  return Math.floor((totalCapacity * (isFeverActive ? feverScoreMultiplier : 1)) / 5);
};

const judgeDrop = () => {
  const topBlock = state.towerBlocks[state.towerBlocks.length - 1];

  if (!topBlock) {
    return { result: "perfect" as JudgeResult, overlapRatio: 1, placedX: state.currentBlock.x };
  }

  const sceneCardElement = document.querySelector<HTMLElement>("[data-scene-card]");
  const towerStackElement = document.querySelector<HTMLElement>("[data-tower-stack]");

  if (sceneCardElement && towerStackElement) {
    const landingEvaluation = evaluateLanding({
      sceneElement: sceneCardElement,
      towerElement: towerStackElement,
      currentBlockX: state.currentBlock.x,
      currentBlockWidth: state.currentBlock.width,
      supportBlockX: topBlock.x,
      supportBlockWidth: topBlock.width,
      nextBlockIndex: state.towerBlocks.length,
      blockHeight,
      cameraOffset,
      perfectSnapToleranceRatio,
      missOverlapThreshold
    });

    if (landingEvaluation) {
      return landingEvaluation;
    }
  }

  const supportWidth = topBlock.width;
  const blockLeft = state.currentBlock.x;
  const blockRight = state.currentBlock.x + state.currentBlock.width;
  const supportLeft = topBlock.x;
  const supportRight = supportLeft + supportWidth;
  const blockCenterX = blockLeft + state.currentBlock.width / 2;
  const supportCenterX = supportLeft + supportWidth / 2;
  const perfectSnapX = supportCenterX - state.currentBlock.width / 2;
  const overlapWidth = Math.max(
    0,
    Math.min(blockRight, supportRight) - Math.max(blockLeft, supportLeft)
  );
  const overlapRatio = overlapWidth / state.currentBlock.width;
  const offsetRatio = Math.abs(blockCenterX - supportCenterX) / state.currentBlock.width;

  if (offsetRatio <= perfectSnapToleranceRatio) {
    return { result: "perfect" as JudgeResult, overlapRatio: 1, placedX: perfectSnapX };
  }

  if (overlapRatio >= missOverlapThreshold) {
    return { result: "good" as JudgeResult, overlapRatio, placedX: state.currentBlock.x };
  }

  return { result: "miss" as JudgeResult, overlapRatio, placedX: state.currentBlock.x };
};

const finishDrop = () => {
  if (state.isWon || state.isGameOver) {
    return;
  }

  const { result, overlapRatio, placedX } = judgeDrop();
  const nextHeight = result === "miss" ? state.height : state.height + 1;
  const previousUnlocked = state.unlockedLevels;
  const unlockedLevels = getUnlockedFromHeight(nextHeight, previousUnlocked);
  const newlyUnlockedLevel = getNewlyUnlockedLevel(previousUnlocked, unlockedLevels);
  const selectedLevel = newlyUnlockedLevel ?? state.selectedLevel;
  const currentStage = getStageForHeight(nextHeight + 1);
  const usedFeverForThisDrop = state.isFeverActive && state.feverValue > 0;
  const nextPerfectCombo = result === "perfect" ? state.perfectCombo + 1 : 0;
  const nextFeverValue = result === "perfect" ? feverMaxValue : state.feverValue;
  const nextIsFeverActive = nextFeverValue > 0;
  const activatedFever = !state.isFeverActive && nextIsFeverActive;
  const capacityGain =
    result === "miss"
      ? 0
      : calculateCapacityGain(overlapRatio, nextHeight, nextPerfectCombo, usedFeverForThisDrop);
  const nextCapacity = state.capacity + capacityGain;
  const nextMissCount = result === "miss" ? state.missCount + 1 : state.missCount;
  const stabilityDelta =
    result === "perfect" ? 4 : result === "good" ? -Math.round((1 - overlapRatio) * 18) : -12;
  const nextStability = Math.min(100, Math.max(0, state.stability + stabilityDelta));
  const isWon = nextHeight >= winLevel;
  const isGameOver = !isWon && nextMissCount >= maxMissCount;
  const bestCapacity = Math.max(state.bestCapacity, nextCapacity);
  const towerBlocks =
    result === "miss"
      ? state.towerBlocks
      : [
          ...state.towerBlocks,
          {
            id: state.currentBlock.id,
            x: placedX,
            width: state.currentBlock.width,
            label: state.currentBlock.label,
            themeId: state.currentBlock.themeId,
            judge: result,
            overlapRatio
          }
        ];

  state = {
    ...state,
    towerBlocks,
    currentBlock: createCurrentBlock(nextHeight, lastFrameTime),
    height: nextHeight,
    capacity: nextCapacity,
    bestCapacity,
    missCount: nextMissCount,
    stability: nextStability,
    perfectCombo: nextPerfectCombo,
    feverValue: nextFeverValue,
    isFeverActive: nextIsFeverActive,
    unlockedLevels,
    selectedLevel,
    currentThemeId: currentStage.theme.id,
    isWon,
    isGameOver,
    lastJudge: result,
    lastCapacityGain: capacityGain,
    lastGainUsedFever: usedFeverForThisDrop && capacityGain > 0
  };

  if (isGameOver) {
    localStorage.setItem(storageKeys.baseProgress, String(getUpdatedBaseProgressStep(nextHeight)));
  }

  if (isWon || isGameOver) {
    sceneVisualHeight = nextHeight;
  }

  persistProgress(state);
  render();

  if (result === "perfect") {
    playAudio("gameBlockLandPerfect");
    playAudio("gameBlockLandGood");
  } else if (result === "good") {
    playAudio("gameBlockLandGood");
  } else {
    playAudio("gameBlockMissFall");
  }

  if (capacityGain > 0 && !isWon) {
    playAudio("gameScoreBonus");
  }

  if (activatedFever && !isWon) {
    playAudio("gameFeverActivate");
  }

  if (newlyUnlockedLevel && !isWon) {
    playAudio("gameUnlockStage");
  }

  if (isWon) {
    stopGameplayBgm();
    playAudio("uiPopupOpen");
    playAudio("jingleVictory");
  } else if (isGameOver) {
    stopGameplayBgm();
    playAudio("uiPopupOpen");
    playAudio("jingleFail");
  }

  if (isWon) {
    void registerRemoteClear();
  }
};

const releaseBlock = () => {
  if (tutorialOpen || state.isWon || state.isGameOver || state.currentBlock.mode !== "hanging") {
    return;
  }

  playGameplayBgm();
  playAudio("gameBlockRelease");

  state = {
    ...state,
    currentBlock: {
      ...state.currentBlock,
      mode: "falling"
    },
    lastJudge: null,
    lastCapacityGain: 0,
    lastGainUsedFever: false
  };
  render();
};

const resetGame = () => {
  stopGameplayBgm();
  state = createInitialState();
  cameraOffset = getCameraTargetOffsetForHeight(state.height);
  sceneVisualHeight = state.height;
  towerSwayPhase = 0;
  persistProgress(state);
  render();
};

const selectBuilding = (building: BuildingConfigItem) => {
  if (!state.unlockedLevels.includes(building.level)) {
    return;
  }

  state = {
    ...state,
    selectedLevel: building.level
  };

  render();
};

const renderPlayerStatus = () => {
  if (!playerContext.userId) {
    return "";
  }

  const clearedAt = playerContext.clearedAt
    ? `<span>${escapeHtml(formatApiTime(playerContext.clearedAt))}</span>`
    : "";

  return `
    <section class="player-status" aria-live="polite">
      <span>用户 ${escapeHtml(playerContext.userId)}</span>
      <strong>${getRemoteClearText()}</strong>
      ${clearedAt}
    </section>
  `;
};

const renderProgress = () =>
  progressNodes
    .map((node, index) => {
      const isUnlocked = state.unlockedLevels.includes(node.level);
      const isSelected = state.selectedLevel === node.level;
      const nodeClassNames = [
        "progress-node",
        isUnlocked ? "unlocked" : "locked",
        isSelected ? "selected" : ""
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button
          class="${nodeClassNames}"
          data-level="${node.level}"
          style="--node-accent: ${node.theme.accentColor}; --node-glow: ${node.theme.glowColor};"
          ${isUnlocked ? "" : "disabled"}
          aria-label="${isUnlocked ? `查看 ${node.name} 介绍` : `未解锁节点 ${index + 1}`}"
        >
          <span class="node-icon">${isUnlocked ? node.icon : node.lockedIcon}</span>
          <span class="node-label">${isUnlocked ? node.name : "??"}</span>
        </button>
      `;
    })
    .join("");

const renderTowerBlocks = () =>
  state.towerBlocks
    .map((block, index) => {
      const className = ["tower-block", `judge-${block.judge}`].join(" ");
      return `
        <div
          class="${className}"
          aria-label="${escapeHtml(block.label)} 方块"
          style="
            left: ${block.x}px;
            bottom: calc(${index * blockHeight}px - var(--camera-offset));
            width: ${block.width}px;
            height: ${blockHeight}px;
            ${getBlockThemeStyle(block.themeId)}
          "
        >
          <span class="block-cat" aria-hidden="true"></span>
        </div>
      `;
    })
    .join("");

const renderJudgeToast = () => {
  if (!state.lastJudge) {
    return "";
  }

  const judgeText = {
    perfect: "Perfect 精准就位",
    good: "Good 稳稳落位",
    miss: "Miss 施工偏差"
  }[state.lastJudge];
  const gainText = state.lastCapacityGain > 0 ? `+${state.lastCapacityGain} 人` : "未增加容纳";
  const feverText = state.lastGainUsedFever ? "FEVER +50%" : "";

  return `
    <div class="judge-toast judge-${state.lastJudge}" aria-live="polite">
      <strong>${judgeText}</strong>
      <span>${gainText}</span>
      ${feverText ? `<span class="judge-fever-text">${feverText}</span>` : ""}
    </div>
  `;
};

const renderMissHearts = () =>
  Array.from({ length: maxMissCount }, (_, index) => {
    const isRemaining = index < maxMissCount - state.missCount;
    return `<span class="hud-heart ${isRemaining ? "active" : "inactive"}" aria-hidden="true">❤</span>`;
  }).join("");

const renderStageGuide = () => {
  const nextNode = getNextProgressNode();
  const remainingFloors = Math.max(0, nextNode.heightRequired - state.height);

  return `
    <div class="stage-guide" data-stage-guide style="bottom: ${getStageGuideBottom()}px;">
      <span>${remainingFloors === 0 ? "当前阶段" : `还差 ${remainingFloors} 层`}</span>
      <strong>${nextNode.name}</strong>
    </div>
  `;
};

const renderSceneHud = () => `
  <div class="scene-hud">
    <div class="scene-hud-top">
      <div class="hud-score">
        <span>积分</span>
        <strong>${state.capacity}</strong>
      </div>
      <div class="hud-lives" aria-label="剩余容错次数 ${maxMissCount - state.missCount}">
        ${renderMissHearts()}
      </div>
    </div>
    <div class="fever-panel ${state.isFeverActive ? "active" : ""}" data-fever-panel>
      <div class="fever-panel-header">
        <span>FEVER</span>
        <strong data-fever-label>${getFeverLabel()}</strong>
      </div>
      <div class="fever-track" aria-label="Fever 能量条">
        <div
          class="fever-fill"
          data-fever-fill
          style="width: ${getFeverPercent()}%;"
        ></div>
      </div>
    </div>
  </div>
`;

const renderScene = () => {
  const currentTheme = getBlockThemeStyle(state.currentBlock.themeId);
  const craneRig = getActiveCraneRig();

  return `
    <section
      class="site-card ${state.isFeverActive ? "fever-active" : ""}"
      aria-label="学院叠叠乐施工场景"
      data-action="release"
      data-scene-card
      style="--camera-offset: ${cameraOffset}px; --crane-offset: ${getCraneOffset()}px;"
    >
      ${renderSceneHud()}
      ${renderStageGuide()}
      <div class="site-skyline">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div
        class="crane"
        data-crane
        style="
          --rope-angle: ${-craneRig.ropeAngle}rad;
          --rope-length: ${craneRig.ropeLength}px;
        "
      >
        <div class="crane-rope"></div>
      </div>
      <div
        class="current-block ${state.currentBlock.mode === "falling" ? "falling" : ""}"
        data-current-block
        aria-label="${escapeHtml(state.currentBlock.label)} 方块"
        style="
          left: ${state.currentBlock.x}px;
          top: ${state.currentBlock.y}px;
          width: ${state.currentBlock.width}px;
          height: ${blockHeight}px;
          ${currentTheme}
        "
      >
        <span class="block-cat" aria-hidden="true"></span>
      </div>
      <div
        class="tower-stack"
        data-tower-stack
        style="
          --tower-sway: ${getTowerSway()}px;
          transform: ${getTowerSwayTransform()};
        "
      >
        ${renderTowerBlocks()}
      </div>
      <div class="site-ground">ZGC Academy Ground</div>
      ${renderJudgeToast()}
    </section>
  `;
};

const renderIntro = () => {
  const selectedBuilding = getBuildingByLevel(state.selectedLevel) ?? progressNodes[0];
  const description = getBuildingIntro(selectedBuilding.id);

  return `
    <section class="intro-card" style="--intro-accent: ${selectedBuilding.theme.accentColor}; --intro-glow: ${selectedBuilding.theme.glowColor};">
      <div class="intro-icon" style="${getBlockThemeStyle(selectedBuilding.theme.id)}">${selectedBuilding.icon}</div>
      <div class="intro-content">
        <p class="eyebrow">已解锁建设阶段</p>
        <h2>${selectedBuilding.title}</h2>
        <p>${description}</p>
      </div>
    </section>
  `;
};

const renderOverlay = () => {
  if (!state.isWon && !state.isGameOver) {
    return "";
  }

  return `
    <div class="overlay">
      <div class="result-card">
        <p class="eyebrow">${state.isWon ? "建设完成" : "建设中止"}</p>
        <h2>${state.isWon ? "解锁 C9，学院建成！" : "累计 3 次 miss，挑战失败"}</h2>
        <p>${
          state.isWon
            ? `你已经完成中关村学院的建设挑战，本次学院可容纳 ${state.capacity} 人。`
            : `本次学院可容纳 ${state.capacity} 人，再来一次，把塔楼叠得更稳。`
        }</p>
        <button class="primary-button" data-action="restart">重新开始</button>
      </div>
    </div>
  `;
};

const renderTutorial = () => {
  if (!tutorialOpen) {
    return "";
  }

  return `
    <section class="tutorial-overlay" aria-label="新手教学">
      <div class="tutorial-card">
        <p class="eyebrow">玩法教学</p>
        <h2>欢迎来到中关村学院建大楼</h2>
        <p>点击屏幕，释放吊机上的学院模块。</p>
        <p>模块越对齐，容纳人数越高，塔楼越稳定。</p>
        <p>累计 3 次 miss，挑战失败。</p>
        <div class="tutorial-pad-hint">
          <span class="tutorial-icon">C9</span>
          <span>建到 C9，完成中关村学院建设。</span>
        </div>
        <button class="primary-button" data-action="close-tutorial">开始建设</button>
      </div>
    </section>
  `;
};

const bindEvents = () => {
  document.querySelectorAll<HTMLButtonElement>(".progress-node").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      playAudio("uiButtonTap");
      const level = Number(button.dataset.level);
      const building = getBuildingByLevel(level);

      if (building) {
        selectBuilding(building);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="restart"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      playAudio("uiButtonTap");
      resetGame();
      playGameplayBgm();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="close-tutorial"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      playAudio("uiButtonTap");
      tutorialOpen = false;
      localStorage.setItem(storageKeys.tutorialSeen, "true");
      render();
      playGameplayBgm();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="open-tutorial"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      playAudio("uiButtonTap");
      tutorialOpen = true;
      render();
      playAudio("uiPopupOpen");
    });
  });

  document.querySelectorAll<HTMLElement>('[data-action="release"]').forEach((element) => {
    element.addEventListener("click", releaseBlock);
  });
};

function render() {
  const progressCount = state.unlockedLevels.filter((level) =>
    progressNodes.some((node) => node.level === level)
  ).length;

  root.innerHTML = `
    <main class="game-shell" style="${getThemeCssText()}">
      <header class="top-bar">
        <div>
          <p class="eyebrow">ZGC Academy</p>
          <h1>中关村学院建大楼</h1>
        </div>
        <button class="help-button" data-action="open-tutorial" aria-label="重新打开教程">?</button>
      </header>

      ${renderPlayerStatus()}

      <section class="progress-card">
        <div class="progress-title">
          <span>学院建设进度 · 当前 ${getCurrentStageName()}</span>
          <strong>${progressCount}/${progressNodes.length}</strong>
        </div>
        <div class="progress-track">${renderProgress()}</div>
      </section>

      ${renderIntro()}

      ${renderScene()}

      <footer class="action-bar">
        <button class="secondary-button" data-action="restart">重新开始</button>
        <p>点击施工区域或按空格，让学院模块落位</p>
      </footer>

      ${renderOverlay()}
    </main>

    ${renderTutorial()}
  `;

  bindEvents();
  requestAnimationFrame(updateViewportScale);
}

const updateLiveElements = (time: number, deltaSeconds: number) => {
  if (state.isWon || state.isGameOver || tutorialOpen) {
    return;
  }

  const currentBlockElement = document.querySelector<HTMLElement>("[data-current-block]");
  const craneElement = document.querySelector<HTMLElement>("[data-crane]");
  const gameShellElement = document.querySelector<HTMLElement>(".game-shell");
  const sceneCardElement = document.querySelector<HTMLElement>("[data-scene-card]");
  const stageGuideElement = document.querySelector<HTMLElement>("[data-stage-guide]");
  const towerStackElement = document.querySelector<HTMLElement>("[data-tower-stack]");
  const feverPanelElement = document.querySelector<HTMLElement>("[data-fever-panel]");
  const feverFillElement = document.querySelector<HTMLElement>("[data-fever-fill]");
  const feverLabelElement = document.querySelector<HTMLElement>("[data-fever-label]");

  if (
    !currentBlockElement ||
    !craneElement ||
    !gameShellElement ||
    !sceneCardElement ||
    !stageGuideElement ||
    !towerStackElement ||
    !feverPanelElement ||
    !feverFillElement ||
    !feverLabelElement
  ) {
    return;
  }

  if (state.feverValue > 0) {
    state.feverValue = Math.max(0, state.feverValue - getFeverDecayPerSecond() * deltaSeconds);
    state.isFeverActive = state.feverValue > 0;
  } else if (state.isFeverActive) {
    state.isFeverActive = false;
  }

  feverFillElement.style.width = `${getFeverPercent()}%`;
  feverLabelElement.textContent = getFeverLabel();
  feverPanelElement.classList.toggle("active", state.isFeverActive);
  sceneCardElement.classList.toggle("fever-active", state.isFeverActive);

  const targetCameraOffset = getCameraTargetOffset();
  const cameraLerp = 1 - Math.exp(-deltaSeconds * 7);
  cameraOffset += (targetCameraOffset - cameraOffset) * cameraLerp;
  sceneVisualHeight += (state.height - sceneVisualHeight) * cameraLerp;
  gameShellElement.style.cssText = getThemeCssText(sceneVisualHeight);
  sceneCardElement.style.setProperty("--camera-offset", `${cameraOffset}px`);
  sceneCardElement.style.setProperty("--crane-offset", `${getCraneOffset()}px`);
  stageGuideElement.style.bottom = `${getStageGuideBottom(cameraOffset)}px`;

  if (state.currentBlock.mode === "hanging") {
    const nextPosition = getSwingBlockPosition(time, state.currentBlock.width);
    state.currentBlock.x = nextPosition.x;
    state.currentBlock.y = nextPosition.y;
  } else {
    const dropTargetY = getDropTargetY();
    const nextY = state.currentBlock.y + getBlockFallSpeed() * deltaSeconds;
    state.currentBlock.y = Math.min(dropTargetY, nextY);

    if (state.currentBlock.y >= dropTargetY) {
      finishDrop();
      return;
    }
  }

  towerSwayPhase += deltaSeconds * 1000 * getTowerSwaySpeed();

  currentBlockElement.style.left = `${state.currentBlock.x}px`;
  currentBlockElement.style.top = `${state.currentBlock.y}px`;
  const craneRig = getActiveCraneRig();
  craneElement.style.setProperty("--rope-angle", `${-craneRig.ropeAngle}rad`);
  craneElement.style.setProperty("--rope-length", `${craneRig.ropeLength}px`);
  towerStackElement.style.transform = getTowerSwayTransform();
};

const maybeAutoPlay = () => {
  if (
    !debugAutoplay ||
    tutorialOpen ||
    state.isWon ||
    state.isGameOver ||
    state.height >= debugAutoplayTarget ||
    state.currentBlock.mode !== "hanging"
  ) {
    return;
  }

  const topBlock = state.towerBlocks[state.towerBlocks.length - 1];
  const supportCenterX = topBlock ? topBlock.x + topBlock.width / 2 : sceneWidth / 2;
  const currentCenterX = state.currentBlock.x + state.currentBlock.width / 2;
  const tolerance = topBlock ? Math.max(2, 8 - state.height * 0.15) : sceneWidth;

  if (Math.abs(currentCenterX - supportCenterX) <= tolerance) {
    releaseBlock();
  }
};

const tick = (time: number) => {
  const deltaSeconds = Math.min(0.032, (time - lastFrameTime) / 1000);
  lastFrameTime = time;

  updateLiveElements(time, deltaSeconds);
  maybeAutoPlay();
  animationFrameId = requestAnimationFrame(tick);
};

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    releaseBlock();
  }
});

window.addEventListener("resize", updateViewportScale);
window.addEventListener("orientationchange", updateViewportScale);

updateViewportScale();
persistProgress(state);
render();
animationFrameId = requestAnimationFrame(tick);
void fetchRemoteClearStatus();

window.addEventListener("beforeunload", () => {
  stopGameplayBgm();
  cancelAnimationFrame(animationFrameId);
});
