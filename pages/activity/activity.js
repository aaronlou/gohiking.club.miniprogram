const api = require("../../utils/api");
const fmt = require("../../utils/format");
const { getDifficulty } = require("../../utils/constants");

Page({
  data: {
    loading: true,
    loadError: "",
    slug: "",
    activity: null,
    photos: [],
    photoGroups: [],
    members: [],
    requests: [],
    isMember: false,
    isHost: false,
    loggedIn: false,
    joinState: "", // host | member | pending | rejected | closed | invite | guest | join | open
    joinLabel: "",
    dateLabel: "",
    difficultyLabel: "",
    difficultyNote: "",
    phaseLabel: "",
    joinSubmitting: false,
  },

  onLoad(options) {
    this.setData({ slug: options.slug || "" });
  },

  onShow() {
    if (this.data.slug) this.fetch();
  },

  fetch() {
    this.setData({ loading: !this.data.activity, loadError: "" });
    api
      .get("/api/mp/activities/" + this.data.slug)
      .then((data) => {
        const activity = data.activity;
        const user = api.getUser();
        const membership = activity.membership;
        const phase = fmt.activityPhase(activity);
        let joinState = "guest";
        let joinLabel = "";
        if (data.isHost) {
          joinState = "host";
          joinLabel = "管理这次活动";
        } else if (data.isMember) {
          joinState = "member";
          joinLabel = "看这次的照片";
        } else if (membership && membership.status === "pending") {
          joinState = "pending";
          joinLabel = "等待发起人确认";
        } else if (membership && membership.status === "rejected") {
          joinState = "rejected";
          joinLabel = "这次没有通过";
        } else if (activity.status !== "open") {
          joinState = "closed";
          joinLabel = "报名已结束";
        } else if (activity.joinPolicy === "invite" || activity.visibility === "private") {
          joinState = "invite";
          joinLabel = "仅限发起人邀请";
        } else if (!user) {
          joinState = "login";
          joinLabel = "登录后加入";
        } else {
          joinState = activity.joinPolicy === "open" ? "open" : "join";
          joinLabel = activity.joinPolicy === "open" ? "加入这次活动" : "申请加入";
        }

        const photos = (data.photos || []).map(fmt.decoratePhoto);
        const photoGroups = fmt.groupActivityPhotosByDay(photos);
        const difficulty = getDifficulty(activity.difficulty);

        this.setData({
          loading: false,
          activity,
          photos,
          photoGroups,
          members: data.members || [],
          requests: data.requests || [],
          isMember: data.isMember,
          isHost: data.isHost,
          loggedIn: Boolean(user),
          joinState,
          joinLabel,
          dateLabel: fmt.activityDateLabel(activity.startDate, activity.endDate),
          difficultyLabel: difficulty.label,
          difficultyNote: difficulty.note,
          phaseLabel: fmt.phaseLabel(phase),
        });
        wx.setNavigationBarTitle({ title: activity.title });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "这次活动看不到了" });
      });
  },

  onJoinTap() {
    const state = this.data.joinState;
    const slug = this.data.slug;
    if (state === "host") {
      wx.navigateTo({ url: "/pages/activity-manage/activity-manage?slug=" + slug });
      return;
    }
    if (state === "member") {
      wx.pageScrollTo({ selector: ".album", duration: 300 });
      return;
    }
    if (state === "pending") {
      // 撤回申请
      wx.showModal({
        title: "撤回申请",
        content: "撤回后，发起人将看不到你的申请。",
        success: (res) => {
          if (!res.confirm) return;
          api
            .del("/api/activities/" + this.data.activity.id + "/join")
            .then(() => {
              wx.showToast({ title: "已撤回", icon: "success" });
              this.fetch();
            })
            .catch((err) => wx.showToast({ title: err.message || "没有成功", icon: "none" }));
        },
      });
      return;
    }
    if (state === "login") {
      wx.navigateTo({ url: "/pages/login/login?next=/pages/activity/activity?slug=" + slug });
      return;
    }
    if (state === "join" || state === "open") {
      if (this.data.joinSubmitting) return;
      this.setData({ joinSubmitting: true });
      api
        .post("/api/activities/" + this.data.activity.id + "/join", {})
        .then((data) => {
          this.setData({ joinSubmitting: false });
          if (data.status === "approved") {
            wx.showToast({ title: "已加入这次同行", icon: "success" });
          } else {
            wx.showToast({ title: "申请已提交，等发起人确认", icon: "none" });
          }
          this.fetch();
        })
        .catch((err) => {
          this.setData({ joinSubmitting: false });
          wx.showToast({ title: err.message || "没有成功", icon: "none" });
        });
    }
  },

  onUploadToActivity() {
    if (!api.requireLogin("/pages/upload/upload")) return;
    getApp().globalData.pendingUploadActivitySlug = this.data.activity.slug;
    wx.switchTab({ url: "/pages/upload/upload" });
  },

  onOpenPhoto(e) {
    wx.navigateTo({ url: "/pages/photo/photo?id=" + e.currentTarget.dataset.id });
  },

  onOpenHost() {
    const host = this.data.activity.host;
    if (host) wx.navigateTo({ url: "/pages/hiker/hiker?username=" + host.username });
  },

  onOpenMember(e) {
    wx.navigateTo({ url: "/pages/hiker/hiker?username=" + e.currentTarget.dataset.username });
  },

  onManage() {
    wx.navigateTo({ url: "/pages/activity-manage/activity-manage?slug=" + this.data.slug });
  },

  onRetry() {
    this.fetch();
  },

  onShareAppMessage() {
    const a = this.data.activity;
    return {
      title: (a ? a.title + " · " : "") + "山行档案",
      path: "/pages/activity/activity?slug=" + this.data.slug,
    };
  },
});
