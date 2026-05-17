export type BuildingIntroConfigItem = {
  id: string;
  description: string;
};

export const buildingIntroConfig: BuildingIntroConfigItem[] = [
  {
    id: "c1",
    description: "晨光落在整片施工地面上，宿舍楼被点亮，学院建设从这里开始。"
  },
  {
    id: "c2",
    description: "新芽般的 C2 完成入住准备，第一届学生的生活开始在这里生长。"
  },
  {
    id: "c3",
    description: "橙色灯光点亮 C3 和下沉商业区，校园生活变得热闹起来。"
  },
  {
    id: "c5",
    description: "会议、行政、教师和台球桌聚在 C5，这里像学院跳动的心脏。"
  },
  {
    id: "c7",
    description: "紫色光带照亮新装修好的 C7 办公楼，一切等待你的揭晓。"
  },
  {
    id: "c8",
    description: "学服、舞蹈室、图书馆和健身房陆续开放，C8 让学院运转得更轻快。"
  },
  {
    id: "c9",
    description: "最后一块拼图落位，C9 的教师工位亮起，学院建设正式完成。"
  }
];

export const getBuildingIntro = (id: string) =>
  buildingIntroConfig.find((item) => item.id === id)?.description ?? "这里填写楼栋介绍。";
