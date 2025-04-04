const Tag = require('../models/Tag');
const NoteTag = require('../models/NoteTag');

// @desc    创建标签
// @route   POST /api/tags
// @access  Private
exports.createTag = async (req, res, next) => {
  try {
    const { name, color } = req.body;

    // 检查该用户是否已有同名标签
    const existingTag = await Tag.findOne({
      name,
      userId: req.user.id
    });

    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: '标签名称已存在'
      });
    }

    // 创建标签
    const tag = await Tag.create({
      name,
      color,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      tag
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取标签列表
// @route   GET /api/tags
// @access  Private
exports.getTags = async (req, res, next) => {
  try {
    // 获取用户的所有标签
    const tags = await Tag.find({
      userId: req.user.id
    }).sort({ name: 1 });

    // 为每个标签添加使用该标签的笔记数量
    const tagsWithCount = await Promise.all(
      tags.map(async (tag) => {
        const count = await NoteTag.countDocuments({
          tagId: tag._id,
          userId: req.user.id
        });

        return {
          ...tag.toObject(),
          count
        };
      })
    );

    res.status(200).json({
      success: true,
      tags: tagsWithCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新标签
// @route   PUT /api/tags/:id
// @access  Private
exports.updateTag = async (req, res, next) => {
  try {
    const { name, color } = req.body;

    // 检查标签是否存在
    let tag = await Tag.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }

    // 如果要修改名称，检查是否与其他标签重名
    if (name && name !== tag.name) {
      const existingTag = await Tag.findOne({
        name,
        userId: req.user.id,
        _id: { $ne: req.params.id }
      });

      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: '标签名称已存在'
        });
      }
    }

    // 更新标签
    tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { name, color },
      { new: true }
    );

    res.status(200).json({
      success: true,
      tag
    });
  } catch (err) {
    next(err);
  }
};

// @desc    删除标签
// @route   DELETE /api/tags/:id
// @access  Private
exports.deleteTag = async (req, res, next) => {
  try {
    // 检查标签是否存在
    const tag = await Tag.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }

    // 删除该标签与笔记的所有关联
    await NoteTag.deleteMany({ tagId: tag._id });

    // 删除标签
    await tag.remove();

    res.status(200).json({
      success: true,
      message: '标签已删除'
    });
  } catch (err) {
    next(err);
  }
}; 