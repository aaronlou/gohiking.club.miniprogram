const api = require("../../utils/api");
const fmt = require("../../utils/format");
const { THEME_OPTIONS, FALLBACK_TIPS } = require("../../utils/constants");

const MAX_BATCH = 9;
const MAX_MB = 20;
const UPLOAD_CONCURRENCY = 2;
const EVALUATE_CONCURRENCY = 3;

const STATUS_LABEL = {
  waiting: "等待上传",
  uploading: "上传中",
  waitingEval: "等待观看",
  evaluating: "正在观看",
  accepted: "已收录",
  rejected: "未收录",
  error: "没有完成",
};

function decorateResult(item) {
  const photo = item.photo;
  const accepted = item.accepted;
  const improvements =
    photo && photo.improvements && photo.improvements.length
      ? photo.improvements
      : FALLBACK_TIPS;
  return {
    id: item.index,
    tempPath: item.tempPath,
    status: item.status,
    statusLabel: STATUS_LABEL[item.status] || item.status,
    progress: item.progress || 0,
    error: item.error || "",
    photo: photo ? fmt.decoratePhoto(photo) : null,
    accepted,
    score: photo && photo.score !== null && photo.score !== undefined ? Number(photo.score) : null,
    latencyLabel: item.latencyMs ? (item.latencyMs / 1000).toFixed(1) + "s" : "",
    scoreLabel: photo ? fmt.formatScore(photo.score) : "—",
    verdict: photo && photo.score !== null ? fmt.scoreVerdict(photo.score) : "",
    summary: photo ? photo.summary || "" : "",
    strengths: photo ? photo.strengths || [] : [],
    improvements,
    expanded: false,
  };
}

Page({
  data: {
    view: "login", // login | gate | compose | working | result
    activities: [],
    activity: null,
    mode: "single", // single | batch
    themes: THEME_OPTIONS,
    theme: "auto",
    title: "",
    caption: "",
    locationName: "",
    takenAt: "",
    today: "",
    items: [], // 上传单元
    results: [],
    summaryStats: null,
    doneCount: 0,
    totalCount: 0,
    keyboardUp: false, // 键盘弹起时隐藏吸底提交按钮，避免遮挡输入区
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    if (!this.data.today) {
      this.setData({ today: new Date().toISOString().slice(0, 10) });
    }
    const app = getApp();
    if (app.globalData.pendingUploadActivitySlug) {
      const slug = app.globalData.pendingUploadActivitySlug;
      if (api.getUser()) {
        app.globalData.pendingUploadActivitySlug = null;
        this.loadGate(slug);
      } else {
        // 未登录先保留，登录回来再定位到这次活动
        this.setData({ view: "login" });
      }
      return;
    }
    if (!api.getUser()) {
      this.setData({ view: "login" });
      return;
    }
    if (this.data.view === "login") this.loadGate();
  },

  loadGate(presetSlug) {
    this.setData({ view: "gate" });
    api
      .get("/api/mp/studio")
      .then((data) => {
        const activities = (data.uploadActivities || []).map((a) =>
          Object.assign({}, a, {
            dateLabel: fmt.activityDateLabel(a.startDate, null),
          }),
        );
        this.setData({ activities });
        if (presetSlug) {
          const found = activities.find((a) => a.slug === presetSlug);
          if (found) {
            this.selectActivity(found);
            return;
          }
          wx.showToast({ title: "你没有加入这次活动", icon: "none" });
        }
      })
      .catch((err) => {
        if (err.statusCode === 401) {
          this.setData({ view: "login" });
        } else {
          wx.showToast({ title: err.message || "取不到活动列表", icon: "none" });
        }
      });
  },

  selectActivity(activity) {
    this.setData({ activity, view: "compose", items: [], title: "", caption: "", theme: "auto", locationName: "", takenAt: "" });
  },

  onSelectActivity(e) {
    const id = e.currentTarget.dataset.id;
    const found = this.data.activities.find((a) => a.id === id);
    if (found) this.selectActivity(found);
  },

  onBackToGate() {
    this.setData({ view: "gate", activity: null, items: [] });
  },

  onLogin() {
    wx.navigateTo({ url: "/pages/login/login?next=/pages/upload/upload" });
  },

  onNewActivity() {
    wx.navigateTo({ url: "/pages/activity-new/activity-new" });
  },

  onGoActivities() {
    wx.switchTab({ url: "/pages/activities/activities" });
  },

  /* ---------- 表单 ---------- */

  onKeyboardShow() {
    this.setData({ keyboardUp: true });
  },

  onKeyboardHide() {
    this.setData({ keyboardUp: false });
  },

  onMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },

  onTitle(e) {
    this.setData({ title: e.detail.value });
  },

  onCaption(e) {
    this.setData({ caption: e.detail.value });
  },

  onLocation(e) {
    this.setData({ locationName: e.detail.value });
  },

  onTheme(e) {
    this.setData({ theme: e.currentTarget.dataset.id });
  },

  onTakenAt(e) {
    this.setData({ takenAt: e.detail.value });
  },

  /* ---------- 选图 ---------- */

  chooseImages() {
    wx.chooseMedia({
      count: MAX_BATCH,
      mediaType: ["image"],
      sizeType: ["original"],
      sourceType: ["album", "camera"],
      success: (res) => {
        let files = res.tempFiles.map((f) => ({ path: f.tempFilePath, size: f.size || 0 }));
        const oversized = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
        if (oversized.length) {
          wx.showToast({ title: "单张不能超过 " + MAX_MB + "MB", icon: "none" });
        }
        files = files.filter((f) => f.size <= MAX_MB * 1024 * 1024);
        if (files.length > MAX_BATCH) {
          wx.showToast({
            title: "一次最多放进 " + MAX_BATCH + " 张，已先留下前 " + MAX_BATCH + " 张",
            icon: "none",
          });
          files = files.slice(0, MAX_BATCH);
        }
        if (!files.length) return;
        const items = files.map((f, index) => ({
          index,
          tempPath: f.path,
          size: f.size,
          status: "waiting",
          progress: 0,
          photo: null,
          accepted: false,
          error: "",
          latencyMs: 0,
        }));
        this.setData({ items, mode: files.length > 1 ? "batch" : this.data.mode });
      },
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.items
      .filter((item) => item.index !== index)
      .map((item, i) => Object.assign({}, item, { index: i }));
    this.setData({ items });
  },

  /* ---------- 提交 ---------- */

  onSubmit() {
    const { items, activity } = this.data;
    if (!items.length) {
      wx.showToast({ title: "先选择一张照片", icon: "none" });
      return;
    }
    if (!activity) {
      wx.showToast({ title: "先选择一次活动", icon: "none" });
      return;
    }
    const groupTitle = this.data.title.trim();
    const caption = this.data.caption.trim();
    const base = {
      activityId: activity.id,
      theme: this.data.theme,
      locationName: this.data.locationName.trim(),
      takenAt: this.data.takenAt || "",
      source: "upload",
    };
    if (this.data.mode === "batch") {
      base.caption = caption;
    }

    const tasks = items.map((item, i) => {
      const formData = Object.assign({}, base);
      if (this.data.mode === "batch") {
        formData.title =
          (groupTitle ? groupTitle : "山野") + " " + String(i + 1).padStart(2, "0");
      } else {
        formData.title = groupTitle;
        formData.caption = caption;
      }
      return Object.assign({}, item, { formData, title: formData.title });
    });

    this.setData({
      view: "working",
      results: tasks.map(decorateResult),
      doneCount: 0,
      totalCount: tasks.length,
    });
    this._tasks = tasks;
    this.runPipeline(tasks);
  },

  updateResult(index, patch) {
    const key = "results[" + index + "]";
    const data = {};
    Object.keys(patch).forEach((k) => (data[key + "." + k] = patch[k]));
    this.setData(data);
  },

  runPipeline(tasks) {
    // 阶段一：上传（并发 2）
    const uploadOne = (task) =>
      new Promise((resolve) => {
        this.updateResult(task.index, { status: "uploading", statusLabel: STATUS_LABEL.uploading, progress: 0 });
        api
          .uploadPhoto(task.tempPath, task.formData, (progress) => {
            this.updateResult(task.index, { progress });
          })
          .then((data) => {
            resolve(Object.assign({}, task, { photo: data.photo, uploadOk: true }));
          })
          .catch((err) => {
            resolve(Object.assign({}, task, { uploadOk: false, error: err.message || "上传失败" }));
          });
      });

    runWithConcurrency(tasks, UPLOAD_CONCURRENCY, uploadOne).then((uploaded) => {
      // 阶段二：观看（并发 3）
      const toEvaluate = uploaded.filter((t) => t.uploadOk);
      const evaluateOne = (task) =>
        new Promise((resolve) => {
          this.updateResult(task.index, { status: "evaluating", statusLabel: STATUS_LABEL.evaluating, progress: 100 });
          api
            .request("/api/photos/" + task.photo.id + "/evaluate", { method: "POST", timeout: 180000 })
            .then((data) => {
              const done = decorateResult(
                Object.assign({}, task, {
                  status: data.accepted ? "accepted" : "rejected",
                  photo: data.photo,
                  accepted: data.accepted,
                  latencyMs: data.latencyMs,
                }),
              );
              this.updateResult(task.index, done);
              this.bumpDone();
              resolve();
            })
            .catch((err) => {
              const done = decorateResult(
                Object.assign({}, task, { status: "error", error: err.message || "观看失败" }),
              );
              this.updateResult(task.index, done);
              this.bumpDone();
              resolve();
            });
        });

      // 上传失败的直接标记
      uploaded
        .filter((t) => !t.uploadOk)
        .forEach((task) => {
          const done = decorateResult(Object.assign({}, task, { status: "error", error: task.error }));
          this.updateResult(task.index, done);
          this.bumpDone();
        });

      runWithConcurrency(toEvaluate, EVALUATE_CONCURRENCY, evaluateOne).then(() => {
        this.finishPipeline();
      });
    });
  },

  bumpDone() {
    this.setData({ doneCount: this.data.doneCount + 1 });
  },

  finishPipeline() {
    const results = this.data.results;
    const accepted = results.filter((r) => r.accepted).length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    const failed = results.filter((r) => r.status === "error").length;
    this.setData({
      view: "result",
      summaryStats: {
        total: results.length,
        accepted,
        rejected,
        failed,
      },
    });
  },

  onToggleExpand(e) {
    const index = e.currentTarget.dataset.index;
    this.updateResult(index, { expanded: !this.data.results[index].expanded });
  },

  /* ---------- 结果页单项重试 ---------- */

  onRetryItem(e) {
    const index = e.currentTarget.dataset.index;
    const task = (this._tasks || []).find((t) => t.index === index);
    if (!task || this._retrying) return;
    this._retrying = true;
    const finish = (patch) => {
      this.updateResult(index, patch);
      this._retrying = false;
      this.refreshSummary();
    };
    if (!task.photo || !task.photo.id) {
      // 上传就没成功：整条重走
      this.updateResult(index, { status: "uploading", statusLabel: STATUS_LABEL.uploading, progress: 0, error: "" });
      api
        .uploadPhoto(task.tempPath, task.formData, (progress) => {
          this.updateResult(index, { progress });
        })
        .then((data) => {
          this.evaluateTask(Object.assign({}, task, { photo: data.photo }), index, finish);
        })
        .catch((err) => {
          finish({
            status: "error",
            statusLabel: STATUS_LABEL.error,
            error: err.message || "上传失败",
          });
        });
      return;
    }
    this.evaluateTask(task, index, finish);
  },

  evaluateTask(task, index, finish) {
    this.updateResult(index, { status: "evaluating", statusLabel: STATUS_LABEL.evaluating, progress: 100, error: "" });
    api
      .request("/api/photos/" + task.photo.id + "/evaluate", { method: "POST", timeout: 180000 })
      .then((data) => {
        finish(
          decorateResult(
            Object.assign({}, task, {
              status: data.accepted ? "accepted" : "rejected",
              photo: data.photo,
              accepted: data.accepted,
              latencyMs: data.latencyMs,
            }),
          ),
        );
      })
      .catch((err) => {
        finish(
          decorateResult(
            Object.assign({}, task, { status: "error", error: err.message || "观看失败" }),
          ),
        );
      });
  },

  refreshSummary() {
    const results = this.data.results;
    this.setData({
      summaryStats: {
        total: results.length,
        accepted: results.filter((r) => r.accepted).length,
        rejected: results.filter((r) => r.status === "rejected").length,
        failed: results.filter((r) => r.status === "error").length,
      },
    });
  },

  onOpenPhoto(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: "/pages/photo/photo?id=" + id });
  },

  onPreview(e) {
    const url = e.currentTarget.dataset.url;
    // 优先使用本地临时文件预览：不依赖签名有效期，也不会重新下载
    const urls = this.data.results
      .map((r) => r.tempPath || (r.photo ? r.photo.img : ""))
      .filter(Boolean);
    if (urls.length) wx.previewImage({ current: url, urls });
  },

  onAgain() {
    this.setData({ view: "compose", items: [], title: "", caption: "" });
  },

  onBackToActivity() {
    const activity = this.data.activity;
    if (activity) {
      wx.navigateTo({ url: "/pages/activity/activity?slug=" + activity.slug });
    }
  },

  onBackHome() {
    wx.switchTab({ url: "/pages/home/home" });
  },

  onGoArchive() {
    wx.switchTab({ url: "/pages/archive/archive" });
  },
});

/* 简易并发控制器 */
function runWithConcurrency(list, limit, worker) {
  return new Promise((resolve) => {
    const results = [];
    let cursor = 0;
    let active = 0;
    function next() {
      if (cursor >= list.length && active === 0) {
        resolve(results);
        return;
      }
      while (active < limit && cursor < list.length) {
        const index = cursor++;
        active++;
        Promise.resolve(worker(list[index], index))
          .then((r) => {
            results[index] = r;
          })
          .catch(() => {
            results[index] = null;
          })
          .then(() => {
            active--;
            next();
          });
      }
    }
    next();
  });
}
