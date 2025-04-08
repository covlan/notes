const Share = require('../models/Share');
const Note = require('../models/Note');
const User = require('../models/User');

// @desc    创建笔记分享
// @route   POST /api/shares
// @access  Private
exports.createShare = async (req, res, next) => {
  try {
    const { noteId, shareType, password, expiry } = req.body;

    // 检查笔记是否存在
    const note = await Note.findOne({
      _id: noteId,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 检查是否已存在该笔记的分享
    const existingShare = await Share.findOne({
      noteId,
      userId: req.user.id
    });

    if (existingShare) {
      // 如果存在分享记录但已被取消，则允许重新分享
      if (existingShare.isCanceled) {
        // 更新已有的分享记录，而不是创建新的
        existingShare.isCanceled = false;
        existingShare.shareType = shareType;
        existingShare.sharedAt = new Date();
        
        // 如果是私密分享，更新密码
        if (shareType === 'private' && password) {
          existingShare.password = password;
        }
        
        // 更新过期时间
        if (expiry && parseInt(expiry) > 0) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + parseInt(expiry));
          existingShare.expiry = expiryDate;
        } else {
          // 如果没有设置过期时间，则移除过期时间
          existingShare.expiry = undefined;
        }
        
        // 重置查看数据
        existingShare.views = 0;
        
        await existingShare.save();
        
        // 移除密码后返回
        const shareResponse = existingShare.toObject();
        delete shareResponse.password;
        
        return res.status(200).json({
          success: true,
          share: shareResponse,
          message: '笔记分享已成功更新'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: '该笔记已被分享'
        });
      }
    }

    // 创建分享
    const shareData = {
      noteId,
      userId: req.user.id,
      shareType
    };

    // 如果是私密分享，检查是否提供了密码
    if (shareType === 'private') {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: '私密分享需要提供密码'
        });
      }
      shareData.password = password;
    }

    // 设置过期时间
    if (expiry && parseInt(expiry) > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiry));
      shareData.expiry = expiryDate;
    }

    const share = await Share.create(shareData);

    // 移除密码后返回
    const shareResponse = share.toObject();
    delete shareResponse.password;

    res.status(201).json({
      success: true,
      share: shareResponse
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取用户分享列表
// @route   GET /api/shares
// @access  Private
exports.getShares = async (req, res, next) => {
  try {
    const shares = await Share.find({
      userId: req.user.id,
      isCanceled: { $ne: true } // 排除已取消的分享
    })
      .populate('noteId', 'title')
      .sort({ sharedAt: -1 });

    // 处理响应数据
    const sharesResponse = shares.map(share => {
      const shareObj = share.toObject();
      // 检查noteId是否存在，如果不存在则提供默认值
      if (shareObj.noteId) {
        shareObj.noteTitle = shareObj.noteId.title;
      } else {
        shareObj.noteTitle = '笔记已删除';
      }
      delete shareObj.noteId;
      delete shareObj.password;
      return shareObj;
    });

    res.status(200).json({
      success: true,
      shares: sharesResponse
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取分享详情
// @route   GET /api/shares/:id
// @access  Private/Public
exports.getShare = async (req, res, next) => {
  try {
    const share = await Share.findById(req.params.id)
      .populate('noteId', 'title content')
      .populate('userId', 'username');

    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或已被取消',
        isShareCanceled: true
      });
    }

    // 检查分享是否已被取消
    if (share.isCanceled) {
      return res.status(404).json({
        success: false,
        message: '此笔记分享已被取消',
        isShareCanceled: true
      });
    }

    // 检查分享是否已过期
    if (share.expiry && new Date(share.expiry) < new Date()) {
      return res.status(400).json({
        success: false,
        message: '分享已过期'
      });
    }

    // 检查笔记是否已被删除
    if (!share.noteId) {
      return res.status(404).json({
        success: false,
        message: '笔记已被删除或不存在'
      });
    }

    // 如果是当前用户的分享，或者是公开分享，直接返回
    if ((req.user && req.user.id === share.userId.toString()) || share.shareType === 'public') {
      // 处理响应数据
      const shareResponse = share.toObject();
      shareResponse.noteTitle = shareResponse.noteId.title;
      shareResponse.noteContent = shareResponse.noteId.content;
      shareResponse.username = shareResponse.userId.username;
      delete shareResponse.noteId;
      delete shareResponse.userId;
      delete shareResponse.password;

      // 增加查看次数（如果不是自己的分享）
      if (!req.user || req.user.id !== share.userId.toString()) {
        share.views += 1;
        await share.save();
      }

      return res.status(200).json({
        success: true,
        share: shareResponse
      });
    }

    // 如果是私密分享，返回要求密码信息
    return res.status(401).json({
      success: false,
      message: '私密分享需要提供密码',
      requirePassword: true
    });
  } catch (err) {
    next(err);
  }
};

// @desc    访问分享链接
// @route   POST /api/shares/access/:shareId
// @access  Public
exports.accessShare = async (req, res, next) => {
  try {
    const { password } = req.body;
    const share = await Share.findById(req.params.shareId)
      .select('+password')
      .populate('noteId', 'title content')
      .populate('userId', 'username');

    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在或已被取消',
        isShareCanceled: true
      });
    }

    // 检查分享是否已被取消
    if (share.isCanceled) {
      return res.status(404).json({
        success: false,
        message: '此笔记分享已被取消',
        isShareCanceled: true
      });
    }

    // 检查分享是否已过期
    if (share.expiry && new Date(share.expiry) < new Date()) {
      return res.status(400).json({
        success: false,
        message: '分享已过期'
      });
    }
    
    // 检查笔记是否已被删除
    if (!share.noteId) {
      return res.status(404).json({
        success: false,
        message: '笔记已被删除或不存在'
      });
    }

    // 如果是私密分享，检查密码
    if (share.shareType === 'private') {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: '请提供访问密码',
          requirePassword: true
        });
      }

      const isMatch = await share.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: '密码错误',
          requirePassword: true
        });
      }
    }

    // 增加查看次数
    share.views += 1;
    await share.save();

    res.status(200).json({
      success: true,
      note: {
        id: share.noteId._id,
        title: share.noteId.title,
        content: share.noteId.content,
        userId: share.userId._id,
        username: share.userId.username,
        sharedAt: share.sharedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    取消分享
// @route   DELETE /api/shares/:id
// @access  Private
exports.deleteShare = async (req, res, next) => {
  try {
    // 检查分享是否存在
    const share = await Share.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: '分享不存在'
      });
    }

    // 更新为已取消状态，而不是删除记录
    share.isCanceled = true;
    await share.save();

    res.status(200).json({
      success: true,
      message: '分享已取消'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    检查笔记分享状态
// @route   GET /api/shares/check/:noteId
// @access  Private
exports.checkShare = async (req, res, next) => {
  try {
    const noteId = req.params.noteId;
    
    // 查找该笔记的分享状态
    const share = await Share.findOne({
      noteId,
      userId: req.user.id
    });
    
    // 如果没有找到分享
    if (!share) {
      return res.status(404).json({
        success: false,
        message: '找不到此笔记的分享',
        isShared: false,
        isCanceled: true
      });
    }
    
    // 返回分享状态
    res.status(200).json({
      success: true,
      isShared: true,
      isCanceled: share.isCanceled || false,
      shareType: share.shareType,
      shareId: share._id
    });
  } catch (err) {
    next(err);
  }
}; 