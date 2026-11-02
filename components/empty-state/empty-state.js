Component({
  properties: {
    title: { type: String, value: "正在等第一张山野" },
    desc: { type: String, value: "" },
    actionText: { type: String, value: "" },
    actionTab: { type: String, value: "" },
    actionUrl: { type: String, value: "" },
  },
  methods: {
    onAction() {
      const d = this.data;
      if (d.actionTab) {
        wx.switchTab({ url: d.actionTab });
      } else if (d.actionUrl) {
        wx.navigateTo({ url: d.actionUrl });
      }
    },
  },
});
