const UserSetting = require('../models/UserSetting');
const SiteSetting = require('../models/SiteSetting');
const SystemSetting = require('../models/SystemSetting');

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

// @desc    获取站点设置
// @route   GET /api/settings/site
// @access  Private (只有管理员可以访问)
exports.getSiteSettings = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问站点设置'
      });
    }

    // 获取站点设置，总是只有一条记录
    let siteSettings = await SiteSetting.findOne();

    // 如果没有设置记录，创建一个默认设置
    if (!siteSettings) {
      siteSettings = await SiteSetting.create({});
    }

    res.status(200).json({
      success: true,
      siteSettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新站点设置
// @route   PUT /api/settings/site
// @access  Private (只有管理员可以访问)
exports.updateSiteSettings = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权更新站点设置'
      });
    }

    const {
      siteTitle,
      siteDescription,
      siteKeywords,
      siteLogo,
      footerText
    } = req.body;

    // 获取站点设置
    let siteSettings = await SiteSetting.findOne();

    if (!siteSettings) {
      // 如果不存在则创建
      siteSettings = await SiteSetting.create({
        siteTitle,
        siteDescription,
        siteKeywords,
        siteLogo,
        footerText
      });
    } else {
      // 如果存在则更新
      siteSettings = await SiteSetting.findOneAndUpdate(
        {},
        {
          siteTitle,
          siteDescription,
          siteKeywords,
          siteLogo,
          footerText
        },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      siteSettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取系统安全设置
// @route   GET /api/settings/security
// @access  Private (只有管理员可以访问)
exports.getSecuritySettings = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问安全设置'
      });
    }

    // 获取系统设置，总是只有一条记录
    let securitySettings = await SystemSetting.findOne();

    // 如果没有设置记录，创建一个默认设置
    if (!securitySettings) {
      securitySettings = await SystemSetting.create({});
    }

    res.status(200).json({
      success: true,
      securitySettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新系统安全设置
// @route   PUT /api/settings/security
// @access  Private (只有管理员可以访问)
exports.updateSecuritySettings = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权更新安全设置'
      });
    }

    const {
      allowRegistration,
      sessionLifetime,
      passwordMinLength,
      loginAttemptLimit,
      lockoutDuration,
      storageLimit,
      attachmentSizeLimit
    } = req.body;

    // 获取系统设置
    let securitySettings = await SystemSetting.findOne();

    if (!securitySettings) {
      // 如果不存在则创建
      securitySettings = await SystemSetting.create({
        allowRegistration,
        sessionLifetime,
        passwordMinLength,
        loginAttemptLimit,
        lockoutDuration,
        storageLimit,
        attachmentSizeLimit
      });
    } else {
      // 如果存在则更新
      securitySettings = await SystemSetting.findOneAndUpdate(
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
      securitySettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    上传站点Logo
// @route   POST /api/settings/site/logo
// @access  Private (只有管理员可以访问)
exports.uploadSiteLogo = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: '无权上传站点Logo'
      });
    }

    // 检查文件是否已上传
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Logo文件'
      });
    }

    // 生成Logo的URL路径
    const logoUrl = `/images/logos/${req.file.filename}`;

    // 获取站点设置
    let siteSettings = await SiteSetting.findOne();

    if (!siteSettings) {
      // 如果不存在则创建
      siteSettings = await SiteSetting.create({
        siteLogo: logoUrl
      });
    } else {
      // 如果存在则更新
      siteSettings = await SiteSetting.findOneAndUpdate(
        {},
        { siteLogo: logoUrl },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      logoUrl,
      siteSettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取公共站点信息
// @route   GET /api/settings/public-info
// @access  Public
exports.getPublicSiteInfo = async (req, res, next) => {
  try {
    // 获取站点设置
    const siteSettings = await SiteSetting.findOne().select('siteTitle siteDescription siteKeywords siteLogo footerText');
    
    // 如果没有设置，返回默认值
    const info = siteSettings ? siteSettings : {
      siteTitle: '笔记平台',
      siteDescription: '一个简单易用的个人笔记管理平台',
      siteKeywords: '笔记,知识管理,markdown',
      siteLogo: null,
      footerText: '© 2023 笔记平台'
    };
    
    res.status(200).json({
      success: true,
      info
    });
  } catch (err) {
    next(err);
  }
}; 