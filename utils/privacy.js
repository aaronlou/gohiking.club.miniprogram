/* 隐私保护指引授权处理。
 *
 * 微信基础库 2.32.3+ 对涉及隐私的接口（chooseMedia 等）强制要求用户
 * 同意《隐私保护指引》后才能调用。需在公众平台「设置 → 服务内容声明 →
 * 用户隐私保护指引」中声明"相册（仅写入/选择）"等权限，本文件负责在
 * 触发敏感接口前引导用户完成授权。
 */

function ensurePrivacy() {
  return new Promise((resolve, reject) => {
    // 低版本基础库没有隐私接口，直接放行
    if (!wx.getPrivacySetting || !wx.requirePrivacyAuthorize) {
      resolve();
      return;
    }
    wx.getPrivacySetting({
      success(res) {
        if (!res.needAuthorization) {
          resolve();
          return;
        }
        // 拉起微信官方半屏隐私协议弹窗（内容来自后台配置的指引）
        wx.requirePrivacyAuthorize({
          success: resolve,
          fail: () =>
            reject({
              code: "privacy",
              message: "需要先同意《用户隐私保护指引》才能继续",
            }),
        });
      },
      // 查询失败不阻塞主流程，交由具体 API 自己处理
      fail: resolve,
    });
  });
}

module.exports = { ensurePrivacy };
