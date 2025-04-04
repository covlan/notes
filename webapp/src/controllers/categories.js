const Category = require('../models/Category');
const Note = require('../models/Note');

// @desc    创建分类
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    // 检查该用户是否已有同名分类
    const existingCategory = await Category.findOne({
      name,
      userId: req.user.id
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '分类名称已存在'
      });
    }

    // 创建分类
    const category = await Category.create({
      name,
      description,
      color,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      category
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取分类列表
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    // 获取用户的所有分类
    const categories = await Category.find({
      userId: req.user.id
    }).sort({ name: 1 });

    // 为每个分类添加笔记数量
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Note.countDocuments({
          categoryId: category._id,
          userId: req.user.id,
          inTrash: false
        });

        return {
          ...category.toObject(),
          count
        };
      })
    );

    res.status(200).json({
      success: true,
      categories: categoriesWithCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取单个分类
// @route   GET /api/categories/:id
// @access  Private
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 获取该分类下的笔记数量
    const count = await Note.countDocuments({
      categoryId: category._id,
      userId: req.user.id,
      inTrash: false
    });

    const categoryWithCount = {
      ...category.toObject(),
      count
    };

    res.status(200).json({
      success: true,
      category: categoryWithCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新分类
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    // 检查分类是否存在
    let category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 如果要修改名称，检查是否与其他分类重名
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name,
        userId: req.user.id,
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: '分类名称已存在'
        });
      }
    }

    // 更新分类
    category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, color },
      { new: true }
    );

    res.status(200).json({
      success: true,
      category
    });
  } catch (err) {
    next(err);
  }
};

// @desc    删除分类
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    // 检查分类是否存在
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 将该分类下的所有笔记的分类ID设为null
    await Note.updateMany(
      { categoryId: category._id },
      { categoryId: null }
    );

    // 删除分类
    await category.remove();

    res.status(200).json({
      success: true,
      message: '分类已删除'
    });
  } catch (err) {
    next(err);
  }
}; 