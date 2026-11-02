const api = require("../../utils/api");

Page({
  data: {
    user: null,
    name: "",
    username: "",
    homeBase: "",
    bio: "",
    email: "",
    submitting: false,
  },

  onShow() {
    api
      .fetchSession()
      .then((user) => {
        if (!user) {
          wx.navigateTo({ url: "/pages/login/login?next=/pages/profile/profile" });
          return;
        }
        this.setData({
          user,
          name: user.name || "",
          username: user.username || "",
          homeBase: user.homeBase || "",
          bio: user.bio || "",
          email: user.email || "",
        });
      })
      .catch(() => {
        wx.navigateTo({ url: "/pages/login/login?next=/pages/profile/profile" });
      });
  },

  onName(e) { this.setData({ name: e.detail.value }); },
  onHomeBase(e) { this.setData({ homeBase: e.detail.value }); },
  onBio(e) { this.setData({ bio: e.detail.value }); },

  onSubmit() {
    if (this.data.submitting) return;
    const name = this.data.name.trim();
    if (!name) {
      wx.showToast({ title: "请填写称呼", icon: "none" });
      return;
    }
    if (name.length > 30) {
      wx.showToast({ title: "称呼最多 30 字", icon: "none" });
      return;
    }
    const homeBase = this.data.homeBase.trim();
    if (homeBase.length > 40) {
      wx.showToast({ title: "常出发地最多 40 字", icon: "none" });
      return;
    }
    const bio = this.data.bio.trim();
    if (bio.length > 280) {
      wx.showToast({ title: "简介最多 280 字", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    api
      .updateUser({ name, homeBase, bio })
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: "已保存", icon: "success" });
        setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: "/pages/me/me" }) }), 600);
      })
      .catch((err) => {
        this.setData({ submitting: false });
        wx.showToast({ title: err.message || "保存没有成功", icon: "none" });
      });
  },
});
