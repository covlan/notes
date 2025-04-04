const UserSetting = require('../models/UserSetting');

// @desc    获取用户设置
// @route   GET /api/settings
// @access  Private
exports.getUserSettings = async (req, res, next) => {
  try {
    let settings = await UserSetting.findOne({ userId: req.user.id });

    // 如果用户还没有设置记录，创建一个默认设置
    if (!settings) {
      settings = await UserSetting.create({ userId: req.user.id });
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新用户设置
// @route   PUT /api/settings
// @access  Private
exports.updateUserSettings = async (req, res, next) => {
  try {
    const {
      theme,
      language,
      fontSize,
      editorFontFamily,
      autoSave,
      defaultView,
      sidebarCollapsed,
      notificationEnabled
    } = req.body;

    // 查找用户设置，如果不存在则创建
    let settings = await UserSetting.findOne({ userId: req.user.id });

    if (!settings) {
      settings = await UserSetting.create({
        userId: req.user.id,
        theme,
        language,
        fontSize,
        editorFontFamily,
        autoSave,
        defaultView,
        sidebarCollapsed,
        notificationEnabled
      });
    } else {
      // 更新设置
      settings = await UserSetting.findOneAndUpdate(
        { userId: req.user.id },
        {
          theme,
          language,
          fontSize,
          editorFontFamily,
          autoSave,
          defaultView,
          sidebarCollapsed,
          notificationEnabled
        },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
}; 