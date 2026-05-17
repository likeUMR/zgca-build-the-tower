import nodeRequirements from "./buildingNodeRequirements.json";

export type StageTheme = {
  id: string;
  blockGradient: string;
  backgroundGradient: string;
  accentColor: string;
  glowColor: string;
};

export type BuildingNodeRequirement = {
  id: string;
  level: number;
  heightRequired: number;
};

export type BuildingConfigItem = {
  id: string;
  level: number;
  heightRequired: number;
  name: string;
  title: string;
  icon: string;
  lockedIcon: string;
  isProgressNode: boolean;
  theme: StageTheme;
};

const requirementMap = new Map(
  (nodeRequirements as BuildingNodeRequirement[]).map((item) => [item.id, item])
);

const getRequirement = (id: string): BuildingNodeRequirement => {
  const requirement = requirementMap.get(id);

  if (!requirement) {
    throw new Error(`Missing building requirement config for ${id}.`);
  }

  return requirement;
};

export const buildingConfig: BuildingConfigItem[] = [
  {
    ...getRequirement("c1"),
    id: "c1",
    name: "C1",
    title: "C1 教学楼",
    icon: "C1",
    lockedIcon: "?",
    isProgressNode: true,
    theme: {
      id: "c1",
      blockGradient: "linear-gradient(180deg, #73ddff, #3d8bff)",
      backgroundGradient: "#d9f1ff",
      accentColor: "#3d8bff",
      glowColor: "rgba(115, 221, 255, 0.74)"
    }
  },
  {
    ...getRequirement("c2"),
    id: "c2",
    name: "C2",
    title: "C2 教学楼",
    icon: "C2",
    lockedIcon: "?",
    isProgressNode: true,
    theme: {
      id: "c2",
      blockGradient: "linear-gradient(180deg, #8cf36c, #16cba0)",
      backgroundGradient: "#d7f6df",
      accentColor: "#18bf8d",
      glowColor: "rgba(140, 243, 108, 0.74)"
    }
  },
  {
    ...getRequirement("c3"),
    id: "c3",
    name: "C3",
    title: "C3 教学楼",
    icon: "C3",
    lockedIcon: "?",
    isProgressNode: true,
    theme: {
      id: "c3",
      blockGradient: "linear-gradient(180deg, #ffd95b, #ff8e3d)",
      backgroundGradient: "#ffe0b8",
      accentColor: "#ff8e3d",
      glowColor: "rgba(255, 217, 91, 0.78)"
    }
  },
  {
    ...getRequirement("c5"),
    id: "c5",
    name: "C5",
    title: "C5 教学楼",
    icon: "C5",
    lockedIcon: "?",
    isProgressNode: true,
    theme: {
      id: "c5",
      blockGradient: "linear-gradient(180deg, #ff9bca, #ff4d8d)",
      backgroundGradient: "#ffe0ef",
      accentColor: "#ff4d8d",
      glowColor: "rgba(255, 155, 202, 0.78)"
    }
  },
  {
    ...getRequirement("c7"),
    id: "c7",
    name: "C7",
    title: "C7 教学楼",
    icon: "C7",
    lockedIcon: "?",
    isProgressNode: true,
    theme: {
      id: "c7",
      blockGradient: "linear-gradient(180deg, #bc8cff, #5a61ff)",
      backgroundGradient: "#dcd9ff",
      accentColor: "#6b63ff",
      glowColor: "rgba(188, 140, 255, 0.78)"
    }
  },
  {
    ...getRequirement("c8"),
    id: "c8",
    name: "C8",
    title: "C8 教学楼",
    icon: "C8",
    lockedIcon: "?",
    isProgressNode: true,
    theme: {
      id: "c8",
      blockGradient: "linear-gradient(180deg, #84f6ff, #24c7b1)",
      backgroundGradient: "#d8fff1",
      accentColor: "#24bfae",
      glowColor: "rgba(132, 246, 255, 0.78)"
    }
  },
  {
    ...getRequirement("c9"),
    id: "c9",
    name: "C9",
    title: "C9 教学楼",
    icon: "C9",
    lockedIcon: "?",
    isProgressNode: true,
    theme: {
      id: "c9",
      blockGradient: "linear-gradient(180deg, #fff06d, #ff7a45)",
      backgroundGradient: "#ffe3a8",
      accentColor: "#ff9a2f",
      glowColor: "rgba(255, 240, 109, 0.88)"
    }
  }
];

export const progressNodes = buildingConfig.filter((item) => item.isProgressNode);
export const winLevel = Math.max(...progressNodes.map((item) => item.heightRequired));
