const api = require("../../utils/api");
const { getBaseUrl, setBaseUrl, DEFAULT_BASE_URL } = require("../../utils/config");

Page({
  data: {
    mode: "login", // login | register
    email: "",
    password: "",
    submitting: false,
    next: "",
    showDev: false,
    serverUrl: "",
    defaultServer: DEFAULT_BASE_URL,
  },

  onLoad(options) {
    const next = (options && options.next) || "";
    this.setData({
      next: decodeURIComponent(next),
      serverUrl: getBaseUrl(),
    });
  },

  onMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  onEmail(e) {
    this.setData({ email: e.detail.value });
  },

  onPassword(e) {
    this.setData({ password: e.detail.value });
  },

  onToggleDev() {
    this.setData({ showDev: !this.data.showDev, serverUrl: getBaseUrl() });
  },

  onServerUrl(e) {
    this.setData({ serverUrl: e.detail.value });
  },

  onApplyServer() {
    setBaseUrl(this.data.serverUrl.trim());
    api.clearAuth();
    wx.showToast({ title: "已切换服务器", icon: "success" });
  },

  onSubmit() {
    const email = this.data.email.trim();
    const password = this.data.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      wx.showToast({ title: "请输入有效的邮箱", icon: "none" });
      return;
    }
    if (password.length < 8) {
      wx.showToast({ title: "密码至少 8 位", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    const action =
      this.data.mode === "login" ? api.login(email, password) : api.register(email, password);
    action
      .then(() => {
        this.setData({ submitting: false });
        wx.showToast({ title: "欢迎回来", icon: "success" });
        setTimeout(() => this.navigateNext(), 600);
      })
      .catch((err) => {
        this.setData({ submitting: false });
        wx.showModal({
          title: this.data.mode === "login" ? "登录没有成功" : "注册没有成功",
          content: err.message || "请检查邮箱与密码后，再试一次。",
          showCancel: false,
        });
      });
  },

  navigateNext() {
    const next = this.data.next;
    if (next && next.indexOf("/pages/upload/upload") === 0) {
      wx.switchTab({ url: "/pages/upload/upload" });
    } else if (next && next.indexOf("/pages/me/me") === 0) {
      wx.switchTab({ url: "/pages/me/me" });
    } else if (next && next.indexOf("/pages/") === 0 && next.indexOf("?") !== -1) {
      wx.redirectTo({ url: next });
    } else if (next && next.indexOf("/pages/") === 0) {
      wx.navigateBack({
        fail: () => wx.redirectTo({ url: next }),
      });
    } else {
      wx.switchTab({ url: "/pages/me/me" });
    }
  },
});
