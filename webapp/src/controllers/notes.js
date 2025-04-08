const Note = require('../models/Note');
const NoteTag = require('../models/NoteTag');
const Tag = require('../models/Tag');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');
const Share = require('../models/Share');

// @desc    创建笔记
// @route   POST /api/notes
// @access  Private
exports.createNote = async (req, res, next) => {
  try {
    const { title, content, categoryId, tags } = req.body;

    // 如果提供了分类ID，检查是否存在
    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, userId: req.user.id });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: '分类不存在'
        });
      }
    }

    // 创建笔记
    const note = await Note.create({
      title,
      content,
      categoryId: categoryId || null,
      userId: req.user.id
    });

    // 如果提供了标签，处理标签关联
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagPromises = tags.map(async (tagName) => {
        // 查找或创建标签
        let tag = await Tag.findOne({ name: tagName, userId: req.user.id });
        
        if (!tag) {
          tag = await Tag.create({
            name: tagName,
            userId: req.user.id
          });
        }
        
        // 创建笔记和标签的关联
        await NoteTag.create({
          noteId: note._id,
          tagId: tag._id,
          userId: req.user.id
        });
        
        return {
          id: tag._id,
          name: tag.name
        };
      });

      const noteTags = await Promise.all(tagPromises);
      note.tags = noteTags;
    }

    res.status(201).json({
      success: true,
      note
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取笔记列表
// @route   GET /api/notes
// @access  Private
exports.getNotes = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sort = 'updatedAt', 
      order = 'desc',
      category,
      tag,
      search,
      starred,
      trash
    } = req.query;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sort]: order === 'asc' ? 1 : -1 }
    };

    // 构建查询条件
    const query = { userId: req.user.id };

    // 处理回收站和星标筛选
    if (req.originalUrl.includes('/api/notes/trash') || trash === 'true') {
      query.inTrash = true;
      // 回收站视图不对starred进行过滤，显示所有inTrash=true的笔记，包括星标和非星标
    } else {
      query.inTrash = false;
      
      // 修改星标筛选条件，确保字符串'true'被正确处理
      if (starred === 'true' || starred === true) {
        query.starred = true;
      }
    }

    // 分类筛选
    if (category) {
      query.categoryId = category;
    }

    // 搜索关键词
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { content: searchRegex }
      ];
    }

    // 标签筛选
    let noteIds = [];
    if (tag) {
      const noteTags = await NoteTag.find({ tagId: tag, userId: req.user.id });
      noteIds = noteTags.map(nt => nt.noteId);
      query._id = { $in: noteIds };
    }

    // 执行查询并填充分类和标签信息
    const notesCount = await Note.countDocuments(query);
    
    const notes = await Note.find(query)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('categoryId', 'name')
      .select('title content fileName categoryId userId starred inTrash createdAt updatedAt')
      .lean();
    
    if (notes.length > 0) {
      notes.forEach(note => {
        if (!note.fileName) {
          note.fileName = `${note._id}_${Date.now()}`;
        }
      });
    }

    // 获取笔记的标签
    const noteTagsPromises = notes.map(async (note) => {
      const noteTags = await NoteTag.find({ noteId: note._id })
        .populate('tagId', 'id name');
      
      if (!note.fileName) {
        note.fileName = `${note._id}_${Date.now()}`;
        await Note.findByIdAndUpdate(note._id, { fileName: note.fileName });
      }
      
      return {
        ...note,
        tags: noteTags.map(nt => ({ id: nt.tagId._id, name: nt.tagId.name })),
        categoryName: note.categoryId ? note.categoryId.name : null
      };
    });

    const notesWithTags = await Promise.all(noteTagsPromises);

    res.status(200).json({
      success: true,
      notes: notesWithTags,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: notesCount,
        pages: Math.ceil(notesCount / options.limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取单个笔记
// @route   GET /api/notes/:id
// @access  Private
exports.getNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({ 
      _id: req.params.id,
      userId: req.user.id
    }).populate('categoryId', 'name');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 获取笔记的标签
    const noteTags = await NoteTag.find({ noteId: note._id })
      .populate('tagId', 'id name');
    
    const fullNote = note.toObject();
    fullNote.tags = noteTags.map(nt => ({ id: nt.tagId._id, name: nt.tagId.name }));
    fullNote.categoryName = note.categoryId ? note.categoryId.name : null;

    res.status(200).json({
      success: true,
      note: fullNote
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新笔记
// @route   PUT /api/notes/:id
// @access  Private
exports.updateNote = async (req, res, next) => {
  try {
    const { title, content, categoryId, tags, inTrash, starred } = req.body;

    // 检查笔记是否存在
    let note = await Note.findOne({ 
      _id: req.params.id,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 如果提供了分类ID，检查是否存在
    if (categoryId) {
      const category = await Category.findOne({ _id: categoryId, userId: req.user.id });
      if (!category) {
        return res.status(404).json({
          success: false,
          message: '分类不存在'
        });
      }
    }

    // 准备更新数据
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (inTrash !== undefined) updateData.inTrash = inTrash;
    if (starred !== undefined) updateData.starred = starred;

    // 更新笔记
    note = await Note.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true }
    );

    // 如果提供了标签，更新标签关联
    if (tags && Array.isArray(tags)) {
      // 先删除所有旧的标签关联
      await NoteTag.deleteMany({ noteId: note._id });
      
      if (tags.length > 0) {
        const tagPromises = tags.map(async (tagName) => {
          // 查找或创建标签
          let tag = await Tag.findOne({ name: tagName, userId: req.user.id });
          
          if (!tag) {
            tag = await Tag.create({
              name: tagName,
              userId: req.user.id
            });
          }
          
          // 创建笔记和标签的关联
          await NoteTag.create({
            noteId: note._id,
            tagId: tag._id,
            userId: req.user.id
          });
          
          return {
            id: tag._id,
            name: tag.name
          };
        });
        
        const noteTags = await Promise.all(tagPromises);
        note.tags = noteTags;
      } else {
        note.tags = [];
      }
    }

    res.status(200).json({
      success: true,
      note
    });
  } catch (err) {
    next(err);
  }
};

// @desc    星标笔记
// @route   POST /api/notes/:id/star
// @access  Private
exports.starNote = async (req, res, next) => {
  try {
    // 检查笔记是否存在
    const note = await Note.findOne({ 
      _id: req.params.id,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 切换星标状态
    note.starred = !note.starred;
    await note.save();

    res.status(200).json({
      success: true,
      starred: note.starred
    });
  } catch (err) {
    next(err);
  }
};

// @desc    移动笔记到回收站
// @route   POST /api/notes/:id/trash
// @access  Private
exports.trashNote = async (req, res, next) => {
  try {
    // 检查笔记是否存在
    const note = await Note.findOne({ 
      _id: req.params.id,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 记录当前的starred状态
    const wasStarred = note.starred;

    // 设置为回收站状态，但保留starred状态
    note.inTrash = true;
    
    // 显式保留星标状态(不改变)
    note.starred = wasStarred;
    
    await note.save();

    res.status(200).json({
      success: true,
      message: '笔记已移至回收站',
      note: {
        id: note._id,
        inTrash: true,
        starred: note.starred
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    从回收站恢复笔记
// @route   POST /api/notes/:id/restore
// @access  Private
exports.restoreNote = async (req, res, next) => {
  try {
    // 检查笔记是否存在
    const note = await Note.findOne({ 
      _id: req.params.id,
      userId: req.user.id,
      inTrash: true
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在或不在回收站中'
      });
    }

    // 记录当前的starred状态
    const wasStarred = note.starred;

    // 恢复笔记，但保留starred状态
    note.inTrash = false;
    
    // 显式保留星标状态(不改变)
    note.starred = wasStarred;
    
    await note.save();

    res.status(200).json({
      success: true,
      message: '笔记已恢复',
      note: {
        id: note._id,
        inTrash: false,
        starred: note.starred
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    永久删除笔记
// @route   DELETE /api/notes/:id
// @access  Private
exports.deleteNote = async (req, res, next) => {
  try {
    // 检查笔记是否存在
    const note = await Note.findOne({ 
      _id: req.params.id,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在'
      });
    }

    // 删除笔记标签关联
    await NoteTag.deleteMany({ noteId: note._id });
    
    // 删除关联的分享记录
    await Share.deleteMany({ noteId: note._id });
    
    // 使用findByIdAndDelete替代deprecated的remove方法
    await Note.findByIdAndDelete(note._id);

    res.status(200).json({
      success: true,
      message: '笔记已永久删除'
    });
  } catch (err) {
    console.error('删除笔记时出错:', err);
    next(err);
  }
};

// @desc    清空回收站
// @route   DELETE /api/notes/empty-trash
// @access  Private
exports.emptyTrash = async (req, res, next) => {
  try {
    // 获取所有回收站中的笔记
    const notes = await Note.find({
      userId: req.user.id,
      inTrash: true
    });

    // 删除所有笔记的标签关联
    const noteIds = notes.map(note => note._id);
    await NoteTag.deleteMany({ noteId: { $in: noteIds } });
    
    // 删除关联的分享记录
    await Share.deleteMany({ noteId: { $in: noteIds } });
    
    // 删除所有回收站中的笔记
    await Note.deleteMany({
      userId: req.user.id,
      inTrash: true
    });

    res.status(200).json({
      success: true,
      message: '回收站已清空'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    保存Markdown文件
// @route   POST /api/notes/save-markdown
// @access  Private
exports.saveMarkdown = async (req, res, next) => {
  try {
    const { fileName, content, title: requestTitle } = req.body;

    if (!fileName || !content) {
      return res.status(400).json({
        success: false,
        message: '请提供文件名和内容'
      });
    }

    // 优先使用请求中提供的标题，否则从content中提取
    let title;
    if (requestTitle) {
      // 使用前端传递的标题
      title = requestTitle;
    } else {
      // 从content中提取标题（第一行去掉#号后的内容）
      const titleMatch = content.match(/^#\s+(.+)$/m);
      title = titleMatch ? titleMatch[1] : fileName;
    }

    console.log('保存笔记:', {
      fileName,
      title,
      contentLength: content.length,
      userId: req.user.id
    });

    // 保存到数据库
    let note = await Note.findOne({ fileName, userId: req.user.id });
    
    if (note) {
      console.log('更新现有笔记:', note._id);
      // 更新现有笔记
      note.title = title;
      note.content = content;
      note.updatedAt = new Date();
      await note.save();
    } else {
      console.log('创建新笔记');
      // 创建新笔记
      note = await Note.create({
        title,
        content,
        fileName,
        userId: req.user.id
      });
    }

    // 确保note对象包含fileName字段
    if (!note.fileName) {
      note.fileName = fileName;
      await note.save();
      console.log('添加fileName字段到笔记:', note._id);
    }

    // 使用固定的 files 目录
    const filesDir = path.join(process.cwd(), 'files');
    console.log('当前工作目录:', process.cwd());
    console.log('文件保存目录:', filesDir);
    
    // 创建 files 目录（如果不存在）
    try {
      if (!fs.existsSync(filesDir)) {
        console.log('创建files目录:', filesDir);
        fs.mkdirSync(filesDir, { recursive: true });
      }
    } catch (err) {
      console.error('创建目录失败:', err);
      return res.status(500).json({
        success: false,
        message: '创建文件目录失败',
        error: err.message
      });
    }

    // 创建文件路径
    const filePath = path.join(filesDir, `${fileName}.md`);
    console.log('保存文件到:', filePath);

    // 写入文件
    try {
      fs.writeFileSync(filePath, content);
      console.log('文件保存成功');
    } catch (err) {
      console.error('写入文件失败:', err);
      return res.status(500).json({
        success: false,
        message: '保存文件失败',
        error: err.message
      });
    }

    res.status(200).json({
      success: true,
      note,
      filePath
    });
  } catch (err) {
    console.error('保存Markdown文件时发生错误:', err);
    next(err);
  }
};

// @desc    更新笔记标签
// @route   PUT /api/notes/:id/tags
// @access  Private
exports.updateNoteTags = async (req, res, next) => {
  try {
    const { tagIds } = req.body;
    
    if (!Array.isArray(tagIds)) {
      return res.status(400).json({
        success: false,
        message: 'tagIds必须是数组'
      });
    }

    // 检查笔记是否存在且属于当前用户
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: '笔记不存在或无权访问'
      });
    }

    // 删除现有的笔记-标签关联
    await NoteTag.deleteMany({
      noteId: note._id,
      userId: req.user.id
    });

    // 创建新的笔记-标签关联
    if (tagIds.length > 0) {
      const noteTags = tagIds.map(tagId => ({
        noteId: note._id,
        tagId,
        userId: req.user.id
      }));

      await NoteTag.insertMany(noteTags);
    }

    // 更新笔记的updatedAt字段
    note.updatedAt = Date.now();
    await note.save();

    res.status(200).json({
      success: true,
      message: '笔记标签已更新'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取收藏笔记
// @route   GET /api/notes/starred
// @access  Private
exports.getStarredNotes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'updatedAt', order = 'desc' } = req.query;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sort]: order === 'asc' ? 1 : -1 }
    };

    // 构建查询条件 - 只查询当前用户的已收藏且不在回收站的笔记
    const query = { 
      userId: req.user.id,
      starred: true,
      inTrash: false
    };

    // 执行查询并填充分类信息
    const notesCount = await Note.countDocuments(query);
    
    const notes = await Note.find(query)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('categoryId', 'name')
      .select('title content fileName categoryId userId starred inTrash createdAt updatedAt')
      .lean();
    
    // 确保所有笔记都有文件名
    if (notes.length > 0) {
      notes.forEach(note => {
        if (!note.fileName) {
          note.fileName = `${note._id}_${Date.now()}`;
        }
      });
    }

    // 获取笔记的标签
    const noteTagsPromises = notes.map(async (note) => {
      const noteTags = await NoteTag.find({ noteId: note._id })
        .populate('tagId', 'id name');
      
      return {
        ...note,
        isStarred: true, // 确保客户端知道这是收藏的笔记
        tags: noteTags.map(nt => ({ id: nt.tagId._id, name: nt.tagId.name })),
        categoryName: note.categoryId ? note.categoryId.name : null
      };
    });

    const notesWithTags = await Promise.all(noteTagsPromises);

    res.status(200).json({
      success: true,
      notes: notesWithTags,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: notesCount,
        pages: Math.ceil(notesCount / options.limit)
      }
    });
  } catch (err) {
    console.error('获取收藏笔记出错:', err);
    next(err);
  }
};

// @desc    获取回收站笔记
// @route   GET /api/notes/trash
// @access  Private
exports.getTrashedNotes = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = 'updatedAt', order = 'desc' } = req.query;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sort]: order === 'asc' ? 1 : -1 }
    };

    // 明确设置inTrash=true
    const query = { 
      userId: req.user.id,
      inTrash: true  // 这里强制设置为true，不再依赖URL或参数判断
    };

    // 执行查询并填充分类和标签信息
    const notesCount = await Note.countDocuments(query);
    
    const notes = await Note.find(query)
      .sort(options.sort)
      .skip((options.page - 1) * options.limit)
      .limit(options.limit)
      .populate('categoryId', 'name')
      .select('title content fileName categoryId userId starred inTrash createdAt updatedAt')
      .lean();
    
    if (notes.length > 0) {
      notes.forEach(note => {
        if (!note.fileName) {
          note.fileName = `${note._id}_${Date.now()}`;
        }
      });
    }

    // 获取笔记的标签
    const noteTagsPromises = notes.map(async (note) => {
      const noteTags = await NoteTag.find({ noteId: note._id })
        .populate('tagId', 'id name');
      
      if (!note.fileName) {
        note.fileName = `${note._id}_${Date.now()}`;
        await Note.findByIdAndUpdate(note._id, { fileName: note.fileName });
      }
      
      return {
        ...note,
        tags: noteTags.map(nt => ({ id: nt.tagId._id, name: nt.tagId.name })),
        categoryName: note.categoryId ? note.categoryId.name : null
      };
    });

    const notesWithTags = await Promise.all(noteTagsPromises);

    // 输出调试信息
    console.log(`回收站笔记: 找到${notesWithTags.length}条笔记，查询条件:`, query);

    res.status(200).json({
      success: true,
      notes: notesWithTags,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: notesCount,
        pages: Math.ceil(notesCount / options.limit)
      }
    });
  } catch (err) {
    console.error('获取回收站笔记出错:', err);
    next(err);
  }
}; 