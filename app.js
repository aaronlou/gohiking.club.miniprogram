/**
 * 山行档案 · GOHIKING.CLUB
 * 把走过的山野，好好收起来。
 */
const api = require("./utils/api");

App({
  globalData: {
    user: null,
    sessionReady: false,
  },

  onLaunch() {
    // Older builds stored the session token separately for image URLs. Signed
    // media URLs no longer need it; remove the legacy copy on launch.
    wx.removeStorageSync("gohiking_session_token");
    api
      .fetchSession()
      .then((user) => {
        this.globalData.user = user;
        this.globalData.sessionReady = true;
        if (this.sessionReadyCallback) this.sessionReadyCallback(user);
      })
      .catch(() => {
        this.globalData.user = null;
        this.globalData.sessionReady = true;
        if (this.sessionReadyCallback) this.sessionReadyCallback(null);
      });
  },

  setUser(user) {
    this.globalData.user = user;
  },
});
