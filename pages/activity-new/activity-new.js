const api = require("../../utils/api");
const { DIFFICULTIES, JOIN_POLICIES, VISIBILITIES } = require("../../utils/constants");

Page({
  data: {
    title: "",
    summary: "",
    description: "",
    region: "",
    routeName: "",
    meetingPoint: "",
    startDate: "",
    endDate: "",
    today: "",
    difficulties: DIFFICULTIES,
    difficultyIndex: 1,
    capacity: "",
    joinPolicies: JOIN_POLICIES,
    joinPolicyIndex: 0,
    visibilities: VISIBILITIES,
    visibilityIndex: 0,
    submitting: false,
  },

  onLoad() {
    const today = new Date().toISOString().slice(0, 10);
    this.setData({ today, startDate: today });
  },

  onTitle(e) { this.setData({ title: e.detail.value }); },
  onSummary(e) { this.setData({ summary: e.detail.value }); },
  onDescription(e) { this.setData({ description: e.detail.value }); },
  onRegion(e) { this.setData({ region: e.detail.value }); },
  onRoute(e) { this.setData({ routeName: e.detail.value }); },
  onMeetingPoint(e) { this.setData({ meetingPoint: e.detail.value }); },
  onCapacity(e) { this.setData({ capacity: e.detail.value }); },

  onStartDate(e) { this.setData({ startDate: e.detail.value }); },
  onEndDate(e) { this.setData({ endDate: e.detail.value }); },
  onDifficulty(e) { this.setData({ difficultyIndex: Number(e.detail.value) }); },
  onJoinPolicy(e) { this.setData({ joinPolicyIndex: Number(e.detail.value) }); },
  onVisibility(e) { this.setData({ visibilityIndex: Number(e.detail.value) }); },

  onSubmit() {
    if (this.data.submitting) return;
    const title = this.data.title.trim();
    if (title.length < 2) {
      wx.showToast({ title: "活动名称至少 2 个字", icon: "none" });
      return;
    }
    if (!this.data.startDate) {
      wx.showToast({ title: "请选择出发日期", icon: "none" });
      return;
    }
    if (this.data.endDate && this.data.endDate < this.data.startDate) {
      wx.showToast({ title: "结束日期不能早于出发日期", icon: "none" });
      return;
    }
    const payload = {
      title,
      summary: this.data.summary.trim(),
      description: this.data.description.trim(),
      region: this.data.region.trim(),
      routeName: this.data.routeName.trim(),
      meetingPoint: this.data.meetingPoint.trim(),
      startDate: this.data.startDate,
      endDate: this.data.endDate || "",
      difficulty: DIFFICULTIES[this.data.difficultyIndex].id,
      joinPolicy: JOIN_POLICIES[this.data.joinPolicyIndex].id,
      visibility: VISIBILITIES[this.data.visibilityIndex].id,
    };
    if (this.data.capacity) payload.capacity = this.data.capacity;

    this.setData({ submitting: true });
    api
      .post("/api/activities", payload)
      .then((data) => {
        this.setData({ submitting: false });
        wx.showToast({ title: "活动已建立", icon: "success" });
        setTimeout(() => {
          wx.redirectTo({ url: "/pages/activity/activity?slug=" + data.activity.slug });
        }, 600);
      })
      .catch((err) => {
        this.setData({ submitting: false });
        wx.showToast({ title: err.message || "创建没有成功", icon: "none" });
      });
  },
});
