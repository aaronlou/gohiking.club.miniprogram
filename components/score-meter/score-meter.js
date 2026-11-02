Component({
  properties: {
    score: { type: null, value: null },
    verdict: { type: String, value: "" },
    rejected: { type: Boolean, value: false },
  },
  data: {
    scoreLabel: "—",
    percent: 0,
  },
  observers: {
    score(value) {
      const num = Number(value);
      const valid = value !== null && value !== undefined && !isNaN(num);
      this.setData({
        scoreLabel: valid ? num.toFixed(1) : "—",
        percent: valid ? Math.min((num / 5) * 100, 100) : 0,
      });
    },
  },
});
