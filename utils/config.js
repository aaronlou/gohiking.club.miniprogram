/**
 * 服务器地址配置。
 * 生产环境使用 https://gohiking.club；
 * 本地开发时可改为 http://127.0.0.1:3000（需在开发者工具关闭「校验合法域名」，
 * 或在登录页「开发选项」中临时覆盖，覆盖值保存在本地存储）。
 */
const DEFAULT_BASE_URL = "https://gohiking.club";

function getBaseUrl() {
  const override = wx.getStorageSync("mp_base_url");
  if (override && typeof override === "string" && override.trim()) {
    return override.trim().replace(/\/+$/, "");
  }
  return DEFAULT_BASE_URL;
}

function setBaseUrl(url) {
  if (url && typeof url === "string" && url.trim()) {
    wx.setStorageSync("mp_base_url", url.trim().replace(/\/+$/, ""));
  } else {
    wx.removeStorageSync("mp_base_url");
  }
}

module.exports = {
  DEFAULT_BASE_URL,
  getBaseUrl,
  setBaseUrl,
};
