const api = require("../../utils/api");
const fmt = require("../../utils/format");
const { PHOTO_THEMES } = require("../../utils/constants");

const VIEWS = [
  { id: "theme", label: "按主题" },
  { id: "date", label: "按时间" },
  { id: "author", label: "按摄影师" },
];

Page({
  data: {
    views: VIEWS,
    view: "theme",
    themes: PHOTO_THEMES,
    themeFilter: "",
    loading: true,
    loadError: "",
    photos: [],
    total: 0,
    themeGroups: [],
    monthGroups: [],
    authorGroups: [],
    filteredThemeGroups: [],
  },

  onLoad(options) {
    if (options && options.theme) {
      this.setData({ themeFilter: options.theme });
    }
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    const app = getApp();
    if (app.globalData.pendingArchiveTheme) {
      this.setData({ themeFilter: app.globalData.pendingArchiveTheme, view: "theme" });
      app.globalData.pendingArchiveTheme = null;
    }
    if (!this._loaded) {
      this._loaded = true;
      this.fetch();
    }
  },

  onPullDownRefresh() {
    this.fetch(() => wx.stopPullDownRefresh());
  },

  fetch(done) {
    api
      .get("/api/mp/archive")
      .then((data) => {
        const photos = (data.photos || []).map(fmt.decoratePhoto);
        const themeGroups = fmt.groupByTheme(photos).map((g) => Object.assign(g, {
          photos: g.photos.map(fmt.decoratePhoto),
        }));
        const monthGroups = fmt.groupByMonth(photos);
        const authorGroups = fmt.groupByAuthor(photos);
        this.setData({
          loading: false,
          loadError: "",
          photos,
          total: photos.length,
          themeGroups,
          monthGroups,
          authorGroups,
        });
        this.applyThemeFilter();
        if (done) done();
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "暂时取不到档案" });
        if (done) done();
      });
  },

  applyThemeFilter() {
    const themeFilter = this.data.themeFilter;
    if (!themeFilter) {
      this.setData({ filteredThemeGroups: this.data.themeGroups });
      return;
    }
    this.setData({
      filteredThemeGroups: this.data.themeGroups.filter((g) => g.id === themeFilter),
    });
  },

  onSwitchView(e) {
    this.setData({ view: e.currentTarget.dataset.id });
  },

  onThemeFilter(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ themeFilter: this.data.themeFilter === id ? "" : id });
    this.applyThemeFilter();
  },

  onClearFilter() {
    this.setData({ themeFilter: "" });
    this.applyThemeFilter();
  },

  onRetry() {
    this.setData({ loading: true });
    this.fetch();
  },

  onGoHome() {
    wx.switchTab({ url: "/pages/home/home" });
  },

  onPhotoTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/photo/photo?id=" + id });
  },
});
