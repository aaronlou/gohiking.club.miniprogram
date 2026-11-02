const api = require("../../utils/api");
const fmt = require("../../utils/format");
const { getDifficulty } = require("../../utils/constants");

function decorateActivity(item) {
  const activity = item.activity || item;
  const phase = fmt.activityPhase(activity);
  return Object.assign({}, activity, {
    phase,
    phaseLabel: fmt.phaseLabel(phase),
    dateLabel: fmt.activityDateLabel(activity.startDate, activity.endDate),
    difficultyLabel: getDifficulty(activity.difficulty).label,
    hostName: activity.host ? activity.host.name : "",
    pendingCount: item.pendingCount || activity.pendingCount || 0,
    isHost: false,
  });
}

Page({
  data: {
    loading: true,
    loadError: "",
    loggedIn: false,
    pendingRequests: [],
    myActivities: [],
    recruiting: [],
    past: [],
    publicCount: 0,
    photoTotal: 0,
  },

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
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
        const mine = (data.myActivities || []).map((item) => {
          const d = decorateActivity(item);
          return Object.assign(d, {
            isHost: d.host && user ? d.host.id === user.id : false,
          });
        });
        const mineIds = {};
        mine.forEach((a) => (mineIds[a.id] = true));
        const all = (data.publicActivities || []).map(decorateActivity);
        const others = all.filter((a) => !mineIds[a.id]);
        this.setData({
          loading: false,
          loadError: "",
          loggedIn: Boolean(user),
          pendingRequests: data.pendingRequests || [],
          myActivities: mine,
          recruiting: others.filter((a) => a.phase === "upcoming" || a.phase === "ongoing"),
          past: others.filter((a) => a.phase === "past" || a.phase === "closed"),
          publicCount: all.length,
          photoTotal: all.reduce((sum, a) => sum + (a.photoCount || 0), 0),
        });
        if (done) done();
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "暂时取不到活动" });
        if (done) done();
      });
  },

  onNewActivity() {
    if (!api.requireLogin("/pages/activity-new/activity-new")) return;
    wx.navigateTo({ url: "/pages/activity-new/activity-new" });
  },

  onGoRequests() {
    wx.navigateTo({ url: "/pages/me-activities/me-activities" });
  },

  onOpen(e) {
    const slug = e.currentTarget.dataset.slug;
    wx.navigateTo({ url: "/pages/activity/activity?slug=" + slug });
  },

  onLogin() {
    wx.navigateTo({ url: "/pages/login/login?next=/pages/activities/activities" });
  },

  onRetry() {
    this.setData({ loading: true });
    this.fetch();
  },
});
