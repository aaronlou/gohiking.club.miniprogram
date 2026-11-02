const api = require("../../utils/api");
const fmt = require("../../utils/format");
const { getTheme } = require("../../utils/constants");

Page({
  data: {
    loading: true,
    loadError: "",
    photo: null,
    related: [],
    viewer: null,
    isOwner: false,
    canSeeNote: false,
    isRejected: false,
    isPending: false,
    isPublic: false,
    isActivityOnly: false,
    isPrivate: false,
    theme: null,
    liked: false,
    likeCount: 0,
    likeSubmitting: false,
    publishSubmitting: false,
    metaList: [],
  },

  onLoad(options) {
    this.photoId = options.id;
    this.fetch();
  },

  fetch() {
    this.setData({ loading: true, loadError: "" });
    api
      .get("/api/mp/photos/" + this.photoId)
      .then((data) => {
        const photo = fmt.decoratePhoto(data.photo);
        const viewer = data.viewer || {};
        const theme = getTheme(data.photo.aiTheme || data.photo.theme);
        const metaList = [];
        metaList.push({ label: "拍摄时间", value: fmt.formatDate(photo.takenAt) });
        metaList.push({ label: "地点", value: photo.locationName || "未标注" });
        metaList.push({ label: "器材", value: photo.cameraModel || "未记录" });
        metaList.push({ label: "镜头", value: photo.lensModel || "未记录" });
        if (photo.aperture) metaList.push({ label: "光圈", value: photo.aperture });
        if (photo.shutterSpeed) metaList.push({ label: "快门", value: photo.shutterSpeed });
        if (photo.iso) metaList.push({ label: "ISO", value: String(photo.iso) });
        metaList.push({ label: "尺寸", value: photo.width + " × " + photo.height });

        this.setData({
          loading: false,
          photo,
          related: (data.related || []).map(fmt.decoratePhoto),
          viewer,
          isOwner: viewer.isOwner,
          canSeeNote: viewer.canSeeNote,
          isRejected: photo.status === "rejected",
          isPending: photo.status === "evaluating" || photo.status === "failed",
          isPublic: viewer.isPublic,
          isActivityOnly: photo.visibility === "activity",
          isPrivate: photo.visibility === "private",
          theme,
          liked: Boolean(photo.liked),
          likeCount: photo.likeCount,
          metaList,
          verdict: photo.score !== null ? fmt.scoreVerdict(photo.score) : "",
        });
        wx.setNavigationBarTitle({ title: photo.title || "山野照片" });
      })
      .catch((err) => {
        this.setData({ loading: false, loadError: err.message || "这张照片看不到了" });
      });
  },

  onPreview() {
    const photo = this.data.photo;
    if (photo) wx.previewImage({ current: photo.full, urls: [photo.full, photo.img] });
  },

  onLike() {
    if (this.data.likeSubmitting) return;
    const liked = !this.data.liked;
    const likeCount = this.data.likeCount + (liked ? 1 : -1);
    this.setData({ liked, likeCount, likeSubmitting: true });
    api
      .post("/api/photos/" + this.photoId + "/like")
      .then((data) => {
        this.setData({ liked: data.liked, likeCount: data.likeCount, likeSubmitting: false });
      })
      .catch((err) => {
        this.setData({ liked: !liked, likeCount: this.data.likeCount - (liked ? 1 : -1), likeSubmitting: false });
        if (err.statusCode === 401) {
          wx.navigateTo({ url: "/pages/login/login?next=/pages/photo/photo?id=" + this.photoId });
        } else {
          wx.showToast({ title: err.message || "没有成功", icon: "none" });
        }
      });
  },

  onLoginForLike() {
    wx.navigateTo({ url: "/pages/login/login?next=/pages/photo/photo?id=" + this.photoId });
  },

  onPublish() {
    if (this.data.publishSubmitting) return;
    const photo = this.data.photo;
    if (photo.visibility === "public") {
      // 收回公开
      wx.showModal({
        title: "收回公开",
        content: "收回后，这张照片只对这次活动的同行者可见。",
        success: (res) => {
          if (!res.confirm) return;
          this.setData({ publishSubmitting: true });
          api
            .del("/api/photos/" + this.photoId + "/publish")
            .then(() => {
              wx.showToast({ title: "已收回", icon: "success" });
              this.fetch();
            })
            .catch((err) => wx.showToast({ title: err.message || "没有成功", icon: "none" }))
            .then(() => this.setData({ publishSubmitting: false }));
        },
      });
      return;
    }
    wx.showModal({
      title: "放进公共档案",
      content: "我们会请山野认真观看这张照片（约 10–40 秒）。达到 3 分后，它将出现在公共档案中。",
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ publishSubmitting: true });
        wx.showLoading({ title: "正在认真观看…", mask: true });
        api
          .request("/api/photos/" + this.photoId + "/publish", { method: "POST", timeout: 180000 })
          .then((data) => {
            wx.hideLoading();
            if (data.accepted) {
              wx.showToast({ title: "已放进公共档案", icon: "success" });
            } else {
              wx.showToast({ title: "这次还差一点，照片仍然留在活动里", icon: "none" });
            }
            this.fetch();
          })
          .catch((err) => {
            wx.hideLoading();
            wx.showToast({ title: err.message || "观看没有完成", icon: "none" });
          })
          .then(() => this.setData({ publishSubmitting: false }));
      },
    });
  },

  onDelete() {
    wx.showModal({
      title: "删除这张照片",
      content: "原图与预览会立即移除，之后无法恢复。",
      confirmColor: "#a73a25",
      success: (res) => {
        if (!res.confirm) return;
        api
          .del("/api/photos/" + this.photoId)
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            setTimeout(() => wx.switchTab({ url: "/pages/me/me" }), 600);
          })
          .catch((err) => wx.showToast({ title: err.message || "删除失败", icon: "none" }));
      },
    });
  },

  onOpenActivity() {
    const photo = this.data.photo;
    if (photo && photo.activity && photo.activity.visibility !== "private") {
      wx.navigateTo({ url: "/pages/activity/activity?slug=" + photo.activity.slug });
    }
  },

  onOpenAuthor() {
    const photo = this.data.photo;
    if (photo) wx.navigateTo({ url: "/pages/hiker/hiker?username=" + photo.author.username });
  },

  onOpenRelated(e) {
    wx.navigateTo({ url: "/pages/photo/photo?id=" + e.currentTarget.dataset.id });
  },

  onRetry() {
    this.fetch();
  },

  onBackStudio() {
    wx.switchTab({ url: "/pages/me/me" });
  },

  onShareAppMessage() {
    const photo = this.data.photo;
    return {
      title: (photo ? photo.title + " · " : "") + "山行档案",
      path: "/pages/photo/photo?id=" + this.photoId,
      imageUrl: photo ? photo.thumb : "",
    };
  },
});
