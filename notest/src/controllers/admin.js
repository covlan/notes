const SystemSetting = require('../models/SystemSetting');

// @desc    获取系统设置
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getSystemSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();

    // 如果没有设置记录，创建默认设置
    if (!settings) {
      settings = await SystemSetting.create({});
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新系统设置
// @route   PUT /api/admin/settings
// @access  Private/Admin
exports.updateSystemSettings = async (req, res, next) => {
  try {
    const {
      allowRegistration,
      sessionLifetime,
      passwordMinLength,
      loginAttemptLimit,
      lockoutDuration,
      storageLimit,
      attachmentSizeLimit
    } = req.body;

    // 查找或创建系统设置
    let settings = await SystemSetting.findOne();

    if (!settings) {
      settings = await SystemSetting.create({
        allowRegistration,
        sessionLifetime,
        passwordMinLength,
        loginAttemptLimit,
        lockoutDuration,
        storageLimit,
        attachmentSizeLimit
      });
    } else {
      // 更新设置
      settings = await SystemSetting.findOneAndUpdate(
        {},
        {
          allowRegistration,
          sessionLifetime,
          passwordMinLength,
          loginAttemptLimit,
          lockoutDuration,
          storageLimit,
          attachmentSizeLimit
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