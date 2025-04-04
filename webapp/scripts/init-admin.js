/**
 * 初始化管理员账户脚本
 * 此脚本会自动设置管理员账户的密码
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('已连接到MongoDB'))
.catch(err => {
  console.error('MongoDB连接失败:', err.message);
  process.exit(1);
});

// 创建用户模型
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  displayName: String,
  role: String,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', UserSchema);

// 管理员账户信息
const adminData = {
  username: 'admin',
  password: 'password',
  email: 'admin@example.com'
};

async function initAdmin() {
  try {
    console.log('正在初始化管理员账户...');
    
    // 查找管理员用户
    const adminUser = await User.findOne({ username: adminData.username });
    
    if (!adminUser) {
      console.log('未找到管理员账户，创建新账户...');
      
      // 哈希密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      // 创建新管理员
      const newAdmin = new User({
        username: adminData.username,
        email: adminData.email,
        password: hashedPassword,
        displayName: '管理员',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAdmin.save();
      console.log('✅ 管理员账户创建成功!');
    } else {
      console.log('找到现有管理员账户，更新密码...');
      
      // 更新现有管理员密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      adminUser.password = hashedPassword;
      adminUser.updatedAt = new Date();
      
      await adminUser.save();
      console.log('✅ 管理员密码更新成功!');
    }
    
    console.log(`管理员账户信息:`);
    console.log(`- 用户名: ${adminData.username}`);
    console.log(`- 密码: ${adminData.password}`);
    
    mongoose.disconnect();
    console.log('已断开MongoDB连接');
  } catch (err) {
    console.error('初始化管理员账户失败:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}

// 执行初始化
initAdmin(); 