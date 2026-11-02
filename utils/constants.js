/** 主题、强度、评分标准等常量（与 web 版 src/lib/constants.ts 保持一致） */

const SITE = {
  name: "山行档案",
  latin: "GOHIKING.CLUB",
  tagline: "把走过的山野，好好收起来",
  description: "为户外徒步者建立的影像档案馆。每一张照片都会被认真看见。",
};

const PHOTO_THEMES = [
  { id: "ridge", label: "山脊", latin: "RIDGE", note: "山体、天际线与攀登的尺度", color: "#8f6d4c" },
  { id: "forest", label: "林间", latin: "WOODS", note: "树影、苔藓与潮湿的呼吸", color: "#445c43" },
  { id: "water", label: "水岸", latin: "WATER", note: "溪流、湖泊与倒影", color: "#486f76" },
  { id: "snow", label: "雪线", latin: "SNOWLINE", note: "雪、冰与寒冷中的光", color: "#83999c" },
  { id: "night", label: "星野", latin: "NIGHT", note: "银河、帐篷与夜行的头灯", color: "#3e455e" },
  { id: "trail", label: "路径", latin: "TRAIL", note: "小径、石阶与通往远处的路", color: "#9a7a4e" },
  { id: "company", label: "同行", latin: "COMPANY", note: "人、背影与一起走过的路", color: "#a6583e" },
  { id: "wild", label: "荒野", latin: "WILDLANDS", note: "草甸、戈壁与无人抵达之处", color: "#7d7445" },
];

const THEME_OPTIONS = [{ id: "auto", label: "让山野判断", latin: "AUTO", note: "交给观看模型归类", color: "#81907a" }].concat(PHOTO_THEMES);

function getTheme(id) {
  const found = PHOTO_THEMES.find((t) => t.id === id);
  return found || PHOTO_THEMES[5];
}

const SCORE_RUBRIC = [
  { index: "01", title: "光与色", latin: "LIGHT", description: "曝光是否服务于画面，色彩是否克制而准确。" },
  { index: "02", title: "构图与层次", latin: "COMPOSITION", description: "视线是否有落脚点，前中远景是否形成呼吸。" },
  { index: "03", title: "山野叙事", latin: "NARRATIVE", description: "它是否真的发生在山里，是否留下一个可进入的瞬间。" },
  { index: "04", title: "独特观看", latin: "VISION", description: "是否避开了明信片式的重复，拥有拍摄者自己的眼睛。" },
];

const DIFFICULTIES = [
  { id: "easy", label: "轻松", note: "半天路程，爬升不多" },
  { id: "moderate", label: "适中", note: "一天路程，有些爬升" },
  { id: "hard", label: "偏难", note: "长距离或较大爬升" },
  { id: "expert", label: "高强度", note: "多日或技术路段" },
];

function getDifficulty(id) {
  const found = DIFFICULTIES.find((d) => d.id === id);
  return found || DIFFICULTIES[1];
}

const JOIN_POLICIES = [
  { id: "approval", label: "申请后由我确认" },
  { id: "open", label: "任何人直接加入" },
  { id: "invite", label: "仅限我邀请" },
];

const VISIBILITIES = [
  { id: "listed", label: "公开列出", note: "出现在活动发现页" },
  { id: "unlisted", label: "不列出", note: "凭链接申请加入" },
  { id: "private", label: "私密", note: "仅成员可见" },
];

const SCORE_THRESHOLD = 3;

const FALLBACK_TIPS = [
  "下一次，试着在清晨或黄昏出发，山野的光会更温柔。",
  "留意画面前景，一块石头、一段栏杆，都能让视线停下来。",
  "多等一等，被风吹起的雾、走过的人，都是山野给的瞬间。",
];

module.exports = {
  SITE,
  PHOTO_THEMES,
  THEME_OPTIONS,
  getTheme,
  SCORE_RUBRIC,
  DIFFICULTIES,
  getDifficulty,
  JOIN_POLICIES,
  VISIBILITIES,
  SCORE_THRESHOLD,
  FALLBACK_TIPS,
};
