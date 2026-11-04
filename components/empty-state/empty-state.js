Component({
  options: {
    // 允许 app.wxss 的 .btn 系列样式进入组件，否则空态按钮会退回原生默认样式
    styleIsolation: "apply-shared",
  },
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
