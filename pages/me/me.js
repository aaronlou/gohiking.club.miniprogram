const api = require("../../utils/api");
const fmt = require("../../utils/format");

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "activity", label: "活动" },
  { id: "public", label: "已公开" },
  { id: "pending", label: "待处理" },
];

Page({
  data: {
    loggedIn: false,
    loading: true,
    loadError: "",
    user: null,
    stats: null,
    chapters: [],
    filters: FILTERS,
    filter: "all",
    photos: [],
    filteredPhotos: [],
    counts: {},
    failedCount: 0,
    averageScoreLabel: "—",
    photoCounts: {},
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    const user = api.getUser();
    if (!user) {
      this.setData({ loggedIn: false, loading: false });
      return;
    }
    this.setData({ loggedIn: true, loading: !this.data.user });
    this.fetch();
  },

  onPullDownRefresh() {
    if (api.getUser()) this.fetch(() => wx.stopPullDownRefresh());
    else wx.stopPullDownRefresh();
  },

  fetch(done) {
    api
      .get("/api/mp/studio")
      .then((data) => {
        const overview = data.overview || {};
        const photos = (data.photos || []).map(fmt.decoratePhoto);
        const chapters = (overview.chapters || []).map((chapter) => ({
          activity: Object.assign({}, chapter.activity, {
            phase: fmt.activityPhase(chapter.activity),
            phaseLabel: fmt.phaseLabel(fmt.activityPhase(chapter.activity)),
            dateLabel: fmt.activityDateLabel(chapter.activity.startDate, chapter.activity.endDate),
          }),
          role: chapter.role,
          myPhotoCount: chapter.myPhotoCount,
          myPublicCount: chapter.myPublicCount,
          photoCount: chapter.activity.photoCount,
        }));
        this.setData({
          loading: false,
          loadError: "",
          user: data.user,
          stats: {
            chapters: chapters.length,
            totalPhotos: overview.totalPhotos || 0,
            publicPhotos: overview.publicPhotos || 0,
            likesReceived: overview.likesReceived || 0,
          },
          chapters,
          photos,
          failedCount: overview.failedPhotos || 0,
          averageScoreLabel: fmt.formatScore(overview.averageScore),
        });
        this.applyFilter();
        if (done) done();
      })
      .catch((err) => {
        if (err.statusCode === 401) {
          this.setData({ loggedIn: false, loading: false });
        } else {
          this.setData({ loading: false, loadError: err.message || "暂时取不到档案" });
        }
        if (done) done();
      });
  },

  applyFilter() {
    const filter = this.data.filter;
    const photos = this.data.photos;
    let filtered;
    if (filter === "public") {
      filtered = photos.filter((p) => p.status === "accepted" && p.visibility === "public");
    } else if (filter === "activity") {
      filtered = photos.filter((p) => Boolean(p.activityId));
    } else if (filter === "pending") {
      filtered = photos.filter(
        (p) => p.status === "evaluating" || p.status === "failed" || (p.status === "rejected" && !p.activityId),
      );
    } else {
      filtered = photos;
    }
    const counts = {
      all: photos.length,
      activity: photos.filter((p) => Boolean(p.activityId)).length,
      public: photos.filter((p) => p.status === "accepted" && p.visibility === "public").length,
      pending: photos.filter(
        (p) => p.status === "evaluating" || p.status === "failed" || (p.status === "rejected" && !p.activityId),
      ).length,
    };
    this.setData({ filteredPhotos: filtered, counts });
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.id });
    this.applyFilter();
  },

  onLogin() {
    wx.navigateTo({ url: "/pages/login/login?next=/pages/me/me" });
  },

  onUpload() {
    wx.switchTab({ url: "/pages/upload/upload" });
  },

  onOpenChapter(e) {
    const slug = e.currentTarget.dataset.slug;
    wx.navigateTo({ url: "/pages/activity/activity?slug=" + slug });
  },

  onOpenPhoto(e) {
    wx.navigateTo({ url: "/pages/photo/photo?id=" + e.currentTarget.dataset.id });
  },

  onDeletePhoto(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "删除这张照片",
      content: "原图与预览会立即移除，之后无法恢复。",
      confirmColor: "#a73a25",
      success: (res) => {
        if (!res.confirm) return;
        api
          .del("/api/photos/" + id)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.fetch();
          })
          .catch((err) => wx.showToast({ title: err.message || "删除失败", icon: "none" }));
      },
    });
  },

  onRetryEvaluate(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/photo/photo?id=" + id });
  },

  onMyActivities() {
    wx.navigateTo({ url: "/pages/me-activities/me-activities" });
  },

  onProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  },

  onMyPublicProfile() {
    if (!this.data.user) return;
    wx.navigateTo({ url: "/pages/hiker/hiker?username=" + this.data.user.username });
  },

  onSignOut() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需要重新输入邮箱与密码。",
      success: (res) => {
        if (!res.confirm) return;
        api.signOut().then(() => {
          this.setData({ loggedIn: false, user: null, photos: [], chapters: [], stats: null });
          wx.showToast({ title: "已退出", icon: "success" });
        });
      },
    });
  },

  onRetry() {
    this.setData({ loading: true });
    this.fetch();
  },
});
