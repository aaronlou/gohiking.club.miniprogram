const api = require("../../utils/api");
const fmt = require("../../utils/format");
const { PHOTO_THEMES, SCORE_RUBRIC, SITE } = require("../../utils/constants");

Page({
  data: {
    site: SITE,
    loading: true,
    loadError: "",
    thisWeek: [],
    featured: [],
    stats: { accepted: 0, photographers: 0, averageScore: 0 },
    providerLabel: "",
    themes: PHOTO_THEMES,
    rubric: SCORE_RUBRIC,
    averageScoreLabel: "—",
  },

  onLoad() {
    this.fetch();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh() {
    this.fetch(() => wx.stopPullDownRefresh());
  },

  fetch(done) {
    this.setData({ loading: !this.data.stats.accepted, loadError: "" });
    api
      .get("/api/mp/home")
      .then((data) => {
        const thisWeek = (data.thisWeek || []).map(fmt.decoratePhoto);
        const featured = (data.featured || []).map(fmt.decoratePhoto);
        this.setData({
          loading: false,
          thisWeek,
          featured,
          stats: data.stats || this.data.stats,
          providerLabel: (data.provider && data.provider.label) || "",
          averageScoreLabel: fmt.formatScore((data.stats || {}).averageScore),
        });
        if (done) done();
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "暂时取不到山野" });
        if (done) done();
      });
  },

  onUpload() {
    if (!api.requireLogin("/pages/upload/upload")) return;
    wx.switchTab({ url: "/pages/upload/upload" });
  },

  onGoArchive() {
    wx.switchTab({ url: "/pages/archive/archive" });
  },

  onThemeChip(e) {
    const id = e.currentTarget.dataset.id;
    getApp().globalData.pendingArchiveTheme = id;
    wx.switchTab({ url: "/pages/archive/archive" });
  },

  onPhotoTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/photo/photo?id=" + id });
  },

  onRetry() {
    this.fetch();
  },
});
