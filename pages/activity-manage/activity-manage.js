const api = require("../../utils/api");

Page({
  data: {
    loading: true,
    loadError: "",
    slug: "",
    activity: null,
    requests: [],
    members: [],
    inviteUsername: "",
    submitting: false,
  },

  onLoad(options) {
    this.setData({ slug: options.slug || "" });
    this.fetch();
  },

  fetch() {
    this.setData({ loading: true, loadError: "" });
    api
      .get("/api/mp/activities/" + this.data.slug)
      .then((data) => {
        if (!data.isHost) {
          this.setData({ loading: false, loadError: "只有发起人可以管理这次活动" });
          return;
        }
        this.setData({
          loading: false,
          activity: data.activity,
          requests: data.requests || [],
          members: data.members || [],
        });
        wx.setNavigationBarTitle({ title: "管理 · " + data.activity.title });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "暂时取不到活动" });
      });
  },

  onApprove(e) {
    this.decide(e, "approve");
  },

  onReject(e) {
    this.decide(e, "reject");
  },

  decide(e, action) {
    const memberId = e.currentTarget.dataset.id;
    const label = action === "approve" ? "通过" : "婉拒";
    api
      .patch("/api/activities/" + this.data.activity.id + "/members/" + memberId, { action })
      .then(() => {
        wx.showToast({ title: "已" + label, icon: "success" });
        this.fetch();
      })
      .catch((err) => wx.showToast({ title: err.message || "没有成功", icon: "none" }));
  },

  onRemove(e) {
    const memberId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: "移出成员",
      content: "将 " + name + " 移出后，对方立即失去相册访问权。",
      confirmColor: "#a73a25",
      success: (res) => {
        if (!res.confirm) return;
        api
          .del("/api/activities/" + this.data.activity.id + "/members/" + memberId)
          .then(() => {
            wx.showToast({ title: "已移出", icon: "success" });
            this.fetch();
          })
          .catch((err) => wx.showToast({ title: err.message || "没有成功", icon: "none" }));
      },
    });
  },

  onInviteInput(e) {
    this.setData({ inviteUsername: e.detail.value });
  },

  onInvite() {
    const username = this.data.inviteUsername.trim().toLowerCase();
    if (username.length < 3) {
      wx.showToast({ title: "请输入用户名（3-20 位字母/数字/下划线）", icon: "none" });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    api
      .post("/api/activities/" + this.data.activity.id + "/members", { username })
      .then((data) => {
        this.setData({ submitting: false, inviteUsername: "" });
        wx.showToast({ title: (data.name || username) + " 已加入", icon: "success" });
        this.fetch();
      })
      .catch((err) => {
        this.setData({ submitting: false });
        wx.showToast({ title: err.message || "邀请没有成功", icon: "none" });
      });
  },

  onToggleStatus() {
    const activity = this.data.activity;
    const next = activity.status === "open" ? "closed" : "open";
    const verb = next === "closed" ? "结束报名" : "重新开放报名";
    wx.showModal({
      title: verb,
      content: next === "closed" ? "结束后，其他人将无法申请加入。" : "重新开放后，其他人可以继续申请加入。",
      success: (res) => {
        if (!res.confirm) return;
        api
          .patch("/api/activities/" + activity.id, { status: next })
          .then(() => {
            wx.showToast({ title: "已" + verb, icon: "success" });
            this.fetch();
          })
          .catch((err) => wx.showToast({ title: err.message || "没有成功", icon: "none" }));
      },
    });
  },

  onOpenMember(e) {
    wx.navigateTo({ url: "/pages/hiker/hiker?username=" + e.currentTarget.dataset.username });
  },

  onRetry() {
    this.fetch();
  },
});
