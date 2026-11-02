const api = require("../../utils/api");
const fmt = require("../../utils/format");

Page({
  data: {
    loading: true,
    loadError: "",
    pendingRequests: [],
    hosted: [],
    joined: [],
    user: null,
  },

  onShow() {
    if (!api.requireLogin("/pages/me-activities/me-activities")) return;
    this.fetch();
  },

  onPullDownRefresh() {
    this.fetch(() => wx.stopPullDownRefresh());
  },

  fetch(done) {
    const user = api.getUser();
    api
      .get("/api/mp/activities")
      .then((data) => {
        const decorate = (item) => {
          const a = item.activity || item;
          const phase = fmt.activityPhase(a);
          return Object.assign({}, a, {
            phase,
            phaseLabel: fmt.phaseLabel(phase),
            dateLabel: fmt.activityDateLabel(a.startDate, a.endDate),
            pendingCount: item.pendingCount || 0,
          });
        };
        const mine = (data.myActivities || []).map(decorate);
        this.setData({
          loading: false,
          loadError: "",
          user,
          pendingRequests: data.pendingRequests || [],
          hosted: mine.filter((a) => user && a.host && a.host.id === user.id),
          joined: mine.filter((a) => !user || !a.host || a.host.id !== user.id),
        });
        if (done) done();
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "暂时取不到活动" });
        if (done) done();
      });
  },

  onOpen(e) {
    wx.navigateTo({ url: "/pages/activity/activity?slug=" + e.currentTarget.dataset.slug });
  },

  onManage(e) {
    wx.navigateTo({
      url: "/pages/activity-manage/activity-manage?slug=" + e.currentTarget.dataset.slug,
    });
  },

  onNew() {
    wx.navigateTo({ url: "/pages/activity-new/activity-new" });
  },

  onRetry() {
    this.setData({ loading: true });
    this.fetch();
  },
});
