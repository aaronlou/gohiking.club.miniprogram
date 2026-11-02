Component({
  data: {
    selected: 0,
    list: [
      { path: "/pages/home/home", text: "山野", latin: "FIELD" },
      { path: "/pages/activities/activities", text: "活动", latin: "WALKS" },
      { path: "/pages/upload/upload", text: "放进", latin: "ADD", primary: true },
      { path: "/pages/archive/archive", text: "档案", latin: "ARCHIVE" },
      { path: "/pages/me/me", text: "我的", latin: "ME" },
    ],
  },
  methods: {
    onTap(e) {
      const path = e.currentTarget.dataset.path;
      wx.switchTab({ url: path });
    },
  },
});
