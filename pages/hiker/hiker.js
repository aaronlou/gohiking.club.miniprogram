const api = require("../../utils/api");
const fmt = require("../../utils/format");

Page({
  data: {
    loading: true,
    loadError: "",
    username: "",
    profile: null,
    stats: null,
    photos: [],
    isOwner: false,
    memberSince: "",
    averageScoreLabel: "—",
  },

  onLoad(options) {
    this.setData({ username: options.username || "" });
    this.fetch();
  },

  fetch() {
    this.setData({ loading: true, loadError: "" });
    api
      .get("/api/mp/hikers/" + encodeURIComponent(this.data.username))
      .then((data) => {
        this.setData({
          loading: false,
          profile: data.profile,
          stats: data.stats || {},
          photos: (data.photos || []).map(fmt.decoratePhoto),
          isOwner: data.isOwner,
          memberSince: data.profile.createdAt ? fmt.formatDate(data.profile.createdAt) : "",
          averageScoreLabel: fmt.formatScore((data.stats || {}).averageScore),
        });
        wx.setNavigationBarTitle({ title: data.profile.name || "徒步者" });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "没有找到这位徒步者" });
      });
  },

  onUpload() {
    wx.switchTab({ url: "/pages/upload/upload" });
  },

  onGoArchive() {
    getApp().globalData.pendingArchiveTheme = "";
    wx.switchTab({ url: "/pages/archive/archive" });
  },

  onGoStudio() {
    wx.switchTab({ url: "/pages/me/me" });
  },

  onRetry() {
    this.fetch();
  },

  onShareAppMessage() {
    const p = this.data.profile;
    return {
      title: (p ? p.name + " · " : "") + "山行档案",
      path: "/pages/hiker/hiker?username=" + this.data.username,
    };
  },
});
