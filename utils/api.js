/**
 * 网络层：Cookie 会话管理、请求封装、图片 URL 构造。
 * 后端为 Better Auth Cookie 会话（无 Bearer），
 * 小程序手动保存 / 回传 Set-Cookie 中的会话令牌。
 * 私有图片使用后端签发的短期、单张授权 URL，不暴露 session token。
 */
const { getBaseUrl } = require("./config");

const COOKIE_KEY = "gohiking_cookies";
const USER_KEY = "gohiking_user";

/* ---------- Cookie ---------- */

function splitSetCookie(raw) {
  if (Array.isArray(raw)) return raw;
  let text = String(raw);
  // 兼容多个 Set-Cookie 以换行拼接的情况
  const lines = text.split(/\r?\n/);
  const parts = [];
  lines.forEach((line) => {
    // 按 “, 后面紧跟 name=” 切分，避开 Expires 中的逗号
    parts.push.apply(parts, line.split(/,(?=\s*[^;,\s=]+=[^;]+)/));
  });
  return parts;
}

function saveCookiesFromHeader(header) {
  const raw = header && (header["Set-Cookie"] || header["set-cookie"]);
  if (!raw) return;
  const jar = wx.getStorageSync(COOKIE_KEY) || {};
  const list = Array.isArray(raw) ? raw : splitSetCookie(raw);
  list.forEach((part) => {
    const pair = String(part).split(";")[0];
    const eq = pair.indexOf("=");
    if (eq <= 0) return;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name) return;
    if (name.indexOf("session_data") !== -1) return; // 短时缓存 cookie，不保存
    if (!value) delete jar[name]; // 服务器显式清除该 cookie
    else jar[name] = value;
  });
  wx.setStorageSync(COOKIE_KEY, jar);
}

function getCookieHeader() {
  const jar = wx.getStorageSync(COOKIE_KEY) || {};
  const parts = Object.keys(jar).map((k) => `${k}=${jar[k]}`);
  return parts.length ? { Cookie: parts.join("; ") } : {};
}

function clearAuth() {
  wx.removeStorageSync(COOKIE_KEY);
  wx.removeStorageSync("gohiking_session_token"); // remove legacy token written by older builds
  wx.removeStorageSync(USER_KEY);
}

/* ---------- 登录态 ---------- */

function getUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

function setUser(user) {
  if (user) wx.setStorageSync(USER_KEY, user);
  else wx.removeStorageSync(USER_KEY);
  const app = getApp();
  if (app) app.setUser(user);
}

function fetchSession() {
  return request("/api/mp/session").then((data) => {
    setUser(data.user || null);
    return data.user || null;
  });
}

function requireLogin(nextPath) {
  if (getUser()) return true;
  wx.navigateTo({
    url: "/pages/login/login" + (nextPath ? "?next=" + encodeURIComponent(nextPath) : ""),
  });
  return false;
}

/* ---------- 请求 ---------- */

/* 401 统一拦截：会话过期时清掉本地会话并引导重新登录。
 * 登录 / 注册接口自身的 401（密码错误等）不走这里。 */
let authRedirecting = false;

function handleAuthExpired(path) {
  if (String(path).indexOf("/api/auth/") !== -1) return;
  clearAuth();
  const app = getApp();
  if (app && app.setUser) app.setUser(null);
  if (authRedirecting) return;
  authRedirecting = true;
  setTimeout(() => {
    authRedirecting = false;
  }, 3000);
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current && current.route === "pages/login/login") return;
  wx.showToast({ title: "登录已过期，请重新登录", icon: "none" });
  wx.navigateTo({
    url: "/pages/login/login",
    fail() {
      wx.switchTab({ url: "/pages/home/home" });
    },
  });
}

function request(path, options) {
  const opts = options || {};
  const url = path.indexOf("http") === 0 ? path : getBaseUrl() + path;
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: opts.method || "GET",
      data: opts.data || {},
      timeout: opts.timeout || 20000,
      header: Object.assign(
        { "Content-Type": "application/json" },
        opts.header || {},
        getCookieHeader(),
      ),
      success(res) {
        saveCookiesFromHeader(res.header);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          if (res.statusCode === 401) handleAuthExpired(path);
          const data = res.data && typeof res.data === "object" ? res.data : {};
          reject({
            statusCode: res.statusCode,
            code: data.code || "error",
            message: data.error || data.message || "请求失败（" + res.statusCode + "）",
            data,
          });
        }
      },
      fail() {
        reject({
          statusCode: 0,
          code: "network",
          message: "网络异常，请检查网络或服务器地址",
        });
      },
    });
  });
}

const get = (path) => request(path);
const post = (path, data) => request(path, { method: "POST", data });
const patch = (path, data) => request(path, { method: "PATCH", data });
const del = (path, data) => request(path, { method: "DELETE", data });

/* ---------- 图片 URL ----------
 * 公共图片直接使用 URL；私有图片由 /api/mp/* 返回带 uid/exp/sig 的短期
 * 单张授权 URL，这里只负责补全域名，绝不拼接 session token。
 */
function imageUrl(path) {
  if (!path) return "";
  return path.indexOf("http") === 0 ? path : getBaseUrl() + path;
}

/* ---------- 上传 ----------
 * wx.uploadFile 单独封装：formData 携带 activityId 等字段，文件字段名 photo。
 */
function uploadPhoto(filePath, formData, onProgress) {
  const url = getBaseUrl() + "/api/photos";
  return new Promise((resolve, reject) => {
    const task = wx.uploadFile({
      url,
      filePath,
      name: "photo",
      formData: formData || {},
      timeout: 120000,
      header: Object.assign(getCookieHeader()),
      success(res) {
        saveCookiesFromHeader(res.header);
        let data = {};
        try {
          data = JSON.parse(res.data);
        } catch (e) {
          data = {};
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          if (res.statusCode === 401) handleAuthExpired("/api/photos");
          reject({
            statusCode: res.statusCode,
            code: data.code || "upload_failed",
            message: data.error || "上传失败（" + res.statusCode + "）",
            data,
          });
        }
      },
      fail() {
        reject({ statusCode: 0, code: "network", message: "上传失败，请检查网络" });
      },
    });
    if (task && task.onProgressUpdate && typeof onProgress === "function") {
      task.onProgressUpdate((e) => onProgress(e.progress, e));
    }
  });
}

/* ---------- 认证动作 ---------- */

function login(email, password) {
  return post("/api/auth/sign-in/email", { email, password }).then((data) => {
    const user = (data && data.user) || null;
    setUser(user);
    if (!user) return fetchSession();
    return user;
  });
}

function sanitizeUsername(email) {
  let local = String(email)
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (local.length < 3) local = (local + "hiker").slice(0, 5);
  return local.slice(0, 20);
}

function register(email, password) {
  const base = sanitizeUsername(email);
  const name = base.charAt(0).toUpperCase() + base.slice(1);
  const attempt = (username, retry) =>
    post("/api/auth/sign-up/email", {
      email,
      password,
      name,
      username,
    }).then((data) => {
      const user = (data && data.user) || null;
      setUser(user);
      return user || fetchSession();
    }, (err) => {
      const code = err.code || "";
      const message = err.message || "";
      const conflict =
        code.indexOf("USERNAME") !== -1 ||
        code.indexOf("FAILED_TO_CREATE_USER") !== -1 ||
        message.indexOf("用户名") !== -1;
      if (conflict && retry < 3) {
        return attempt(base + String(retry + 2), retry + 1);
      }
      throw err;
    });
  return attempt(base, 0);
}

function updateUser(payload) {
  // 走 /api/mp/profile，避免 better-auth update-user 对 Origin 头的强校验
  return request("/api/mp/profile", { method: "PATCH", data: payload }).then(() => fetchSession());
}

function signOut() {
  return post("/api/auth/sign-out")
    .catch(() => null)
    .then(() => {
      clearAuth();
      setUser(null);
    });
}

module.exports = {
  request,
  get,
  post,
  patch,
  del,
  imageUrl,
  uploadPhoto,
  login,
  register,
  updateUser,
  signOut,
  fetchSession,
  getUser,
  setUser,
  requireLogin,
  clearAuth,
};
