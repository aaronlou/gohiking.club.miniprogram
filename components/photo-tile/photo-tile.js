Component({
  properties: {
    photo: { type: Object, value: null },
    showAuthor: { type: Boolean, value: true },
    showLike: { type: Boolean, value: true },
  },
  methods: {
    onTap() {
      const photo = this.data.photo;
      if (!photo) return;
      wx.navigateTo({ url: "/pages/photo/photo?id=" + photo.id });
    },
  },
});
