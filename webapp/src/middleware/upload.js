const path = require('path');
const multer = require('multer');
const fs = require('fs');

// 创建上传目录
const createUploadDir = (dir) => {
  const uploadDir = path.join(__dirname, '../../public/', dir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadDir;
    
    // 根据文件类型决定存储位置
    if (file.fieldname === 'siteLogo') {
      uploadDir = createUploadDir('images/logos');
    } else if (file.mimetype.startsWith('image/')) {
      uploadDir = createUploadDir('images/uploads');
    } else {
      uploadDir = createUploadDir('files/uploads');
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名以避免覆盖
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'siteLogo') {
    // 只允许图片作为Logo
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只允许上传图片作为Logo'), false);
    }
  }
  
  // 其他文件类型的规则可以在这里添加
  
  cb(null, true);
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

module.exports = upload; 