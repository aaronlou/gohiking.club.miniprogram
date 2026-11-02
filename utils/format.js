/** 格式化与数据处理工具（对齐 web 版 src/lib/utils.ts 与 src/lib/archive.ts） */
const { getTheme } = require("./constants");
const { imageUrl } = require("./api");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(value) {
  if (!value) return "未记录";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "未记录";
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

function formatScore(score) {
  if (score === null || score === undefined || score === "") return "—";
  const v = Number(score);
  if (isNaN(v)) return "—";
  return v.toFixed(1);
}

function scoreVerdict(score) {
  if (score >= 4.5) return "编辑心头好";
  if (score >= 4) return "很打动我们";
  if (score >= 3) return "放进档案";
  return "还差一点";
}

function initials(name) {
  const clean = String(name || "").trim();
  if (!clean) return "GH";
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/* ---------- 活动相位（Asia/Shanghai） ---------- */

function shanghaiToday() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function activityPhase(activity) {
  if (activity.status === "closed" || activity.status === "archived") return "closed";
  const today = shanghaiToday();
  if (activity.startDate > today) return "upcoming";
  const end = activity.endDate || activity.startDate;
  if (end >= today) return "ongoing";
  return "past";
}

function phaseLabel(phase) {
  return {
    upcoming: "即将出发",
    ongoing: "正在进行",
    past: "已经走过",
    closed: "已结束",
  }[phase] || "";
}

function activityDateLabel(startDate, endDate) {
  const s = new Date(startDate + "T12:00:00+08:00");
  const label = `${s.getMonth() + 1} 月 ${s.getDate()} 日`;
  if (!endDate || endDate === startDate) return label;
  const e = new Date(endDate + "T12:00:00+08:00");
  return `${label} — ${e.getMonth() + 1} 月 ${e.getDate()} 日`;
}

/* ---------- 照片装饰：加绝对图片地址与展示字段 ---------- */

const STATUS_LABELS = {
  evaluating: "观看中",
  accepted: "已收录",
  rejected: "未收录",
  failed: "观看中断",
  unrated: "未观看",
};

function decoratePhoto(photo) {
  const theme = getTheme(photo.aiTheme || photo.theme);
  return Object.assign({}, photo, {
    img: imageUrl(photo.previewUrl || photo.thumbUrl),
    thumb: imageUrl(photo.thumbUrl || photo.previewUrl),
    full: imageUrl(photo.fullUrl || photo.previewUrl),
    themeLabel: theme.label,
    themeLatin: theme.latin,
    themeColor: theme.color,
    scoreLabel: formatScore(photo.score),
    dateLabel: formatShortDate(photo.takenAt || photo.createdAt),
    statusLabel: STATUS_LABELS[photo.status] || photo.status,
  });
}

/* ---------- 档案分组（对应 lib/archive.ts） ---------- */

function photoDate(photo) {
  return photo.takenAt || photo.acceptedAt || photo.createdAt;
}

function groupByTheme(photos) {
  const { PHOTO_THEMES } = require("./constants");
  return PHOTO_THEMES.map((theme) => ({
    id: theme.id,
    label: theme.label,
    latin: theme.latin,
    note: theme.note,
    color: theme.color,
    photos: photos.filter((p) => p.theme === theme.id),
  })).filter((g) => g.photos.length > 0);
}

function groupByMonth(photos) {
  const groups = new Map();
  photos.forEach((photo) => {
    const d = new Date(photoDate(photo));
    const key = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
    const list = groups.get(key) || [];
    list.push(photo);
    groups.set(key, list);
  });
  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => {
      const [year, month] = key.split("-");
      list.sort((a, b) => new Date(photoDate(b)) - new Date(photoDate(a)));
      return { key, label: `${year} 年 ${Number(month)} 月`, latin: `${year}.${month}`, photos: list };
    });
}

function groupByAuthor(photos) {
  const groups = new Map();
  photos.forEach((photo) => {
    const list = groups.get(photo.author.id) || [];
    list.push(photo);
    groups.set(photo.author.id, list);
  });
  return Array.from(groups.values())
    .map((list) => {
      const scores = list.map((p) => p.score || 0).filter(Boolean);
      return {
        id: list[0].author.id,
        name: list[0].author.name,
        username: list[0].author.username,
        homeBase: list[0].author.homeBase,
        photos: list,
        averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        averageScoreLabel: formatScore(
          scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        ),
      };
    })
    .sort((a, b) => b.photos.length - a.photos.length || b.averageScore - a.averageScore);
}

function groupActivityPhotosByDay(photos) {
  const groups = new Map();
  photos.forEach((photo) => {
    const d = new Date(photo.takenAt || photo.createdAt);
    const label = `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
    const list = groups.get(label) || [];
    list.push(photo);
    groups.set(label, list);
  });
  return Array.from(groups.entries()).map(([label, items]) => ({ label, photos: items }));
}

module.exports = {
  pad2,
  formatDate,
  formatShortDate,
  formatScore,
  scoreVerdict,
  initials,
  activityPhase,
  phaseLabel,
  activityDateLabel,
  decoratePhoto,
  groupByTheme,
  groupByMonth,
  groupByAuthor,
  groupActivityPhotosByDay,
  STATUS_LABELS,
};
