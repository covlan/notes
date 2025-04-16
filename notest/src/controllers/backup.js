const BackupSetting = require('../models/BackupSetting');
const Note = require('../models/Note');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const NoteTag = require('../models/NoteTag');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const extract = require('extract-zip');

// @desc    获取备份设置
// @route   GET /api/backup/settings
// @access  Private/Admin
exports.getBackupSettings = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问备份设置'
      });
    }

    // 获取备份设置，总是只有一条记录
    let backupSettings = await BackupSetting.findOne();

    // 如果没有设置记录，创建一个默认设置
    if (!backupSettings) {
      backupSettings = await BackupSetting.create({});
    }

    res.status(200).json({
      success: true,
      backupSettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更新备份设置
// @route   PUT /api/backup/settings
// @access  Private/Admin
exports.updateBackupSettings = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权更新备份设置'
      });
    }

    const {
      autoBackup,
      backupRetention,
      backupLocation
    } = req.body;

    // 获取备份设置
    let backupSettings = await BackupSetting.findOne();

    if (!backupSettings) {
      // 如果不存在则创建
      backupSettings = await BackupSetting.create({
        autoBackup,
        backupRetention,
        backupLocation
      });
    } else {
      // 如果存在则更新
      backupSettings = await BackupSetting.findOneAndUpdate(
        {},
        {
          autoBackup,
          backupRetention,
          backupLocation
        },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      backupSettings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    创建手动备份
// @route   POST /api/backup/create
// @access  Private/Admin
exports.createBackup = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权创建备份'
      });
    }

    // 获取备份设置
    let backupSettings = await BackupSetting.findOne();
    if (!backupSettings) {
      backupSettings = await BackupSetting.create({});
    }

    // 创建备份目录（如果不存在）
    const backupDir = backupSettings.backupLocation || './backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.zip`;
    const backupFilePath = path.join(backupDir, backupFileName);

    // 创建一个写入流
    const output = fs.createWriteStream(backupFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    // 监听所有存档数据写入完成
    output.on('close', async () => {
      
      // 更新最后备份时间
      backupSettings.lastBackupTime = new Date();
      await backupSettings.save();
      
      // 清理旧备份
      cleanupOldBackups(backupDir, backupSettings.backupRetention);
      
      res.status(200).json({
        success: true,
        message: '备份创建成功',
        backupFile: backupFileName,
        size: archive.pointer()
      });
    });

    // 监听错误
    archive.on('error', (err) => {
      throw err;
    });

    // 将存档数据通过管道传输到文件
    archive.pipe(output);

    // 获取所有数据
    const notes = await Note.find();
    const categories = await Category.find();
    const tags = await Tag.find();
    const noteTags = await NoteTag.find();
    const users = await User.find().select('-password');

    // 将数据添加到存档
    archive.append(JSON.stringify(notes), { name: 'notes.json' });
    archive.append(JSON.stringify(categories), { name: 'categories.json' });
    archive.append(JSON.stringify(tags), { name: 'tags.json' });
    archive.append(JSON.stringify(noteTags), { name: 'note_tags.json' });
    archive.append(JSON.stringify(users), { name: 'users.json' });

    // 完成存档
    await archive.finalize();
  } catch (err) {
    next(err);
  }
};

// @desc    恢复备份
// @route   POST /api/backup/restore
// @access  Private/Admin
exports.restoreBackup = async (req, res, next) => {
  try {
    // 检查用户是否是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权恢复备份'
      });
    }

    // 检查是否上传了文件
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传备份文件'
      });
    }

    // 创建临时目录
    const tempDir = path.join(__dirname, '../../temp', Date.now().toString());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 解压备份文件
    try {
      await extract(req.file.path, { dir: tempDir });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: '备份文件格式错误或已损坏'
      });
    }

    // 读取备份数据
    const notesData = JSON.parse(fs.readFileSync(path.join(tempDir, 'notes.json'), 'utf8'));
    const categoriesData = JSON.parse(fs.readFileSync(path.join(tempDir, 'categories.json'), 'utf8'));
    const tagsData = JSON.parse(fs.readFileSync(path.join(tempDir, 'tags.json'), 'utf8'));
    const noteTagsData = JSON.parse(fs.readFileSync(path.join(tempDir, 'note_tags.json'), 'utf8'));
    const usersData = JSON.parse(fs.readFileSync(path.join(tempDir, 'users.json'), 'utf8'));

    // 清空现有数据
    await Note.deleteMany({});
    await Category.deleteMany({});
    await Tag.deleteMany({});
    await NoteTag.deleteMany({});

    // 恢复数据
    await Note.insertMany(notesData);
    await Category.insertMany(categoriesData);
    await Tag.insertMany(tagsData);
    await NoteTag.insertMany(noteTagsData);

    // 用户数据需要特殊处理，不能直接覆盖
    for (const userData of usersData) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        // 如果用户不存在，则创建新用户
        await User.create(userData);
      }
    }

    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      message: '备份恢复成功'
    });
  } catch (err) {
    next(err);
  }
};

// 清理旧备份
const cleanupOldBackups = (backupDir, retention) => {
  try {
    // 获取所有备份文件
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.zip'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 按时间降序排序

    // 如果备份文件数量超过保留数量，删除最旧的文件
    if (files.length > retention) {
      const filesToDelete = files.slice(retention);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
  } catch (err) {
    throw err;
  }
};
