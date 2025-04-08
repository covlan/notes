// 初始化笔记应用数据库
db = db.getSiblingDB('note-app');

// 创建用户集合
db.createCollection('users');
// 创建电子邮件和用户名的唯一索引
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

// 创建笔记集合
db.createCollection('notes');
// 创建索引以加速查询
db.notes.createIndex({ userId: 1 });
db.notes.createIndex({ inTrash: 1 });
db.notes.createIndex({ starred: 1 });
db.notes.createIndex({ categoryId: 1 });

// 创建分类集合
db.createCollection('categories');
db.categories.createIndex({ userId: 1 });

// 创建标签集合
db.createCollection('tags');
db.tags.createIndex({ userId: 1 });

// 创建分享集合
db.createCollection('shares');
db.shares.createIndex({ noteId: 1 });
db.shares.createIndex({ userId: 1 });

// 创建设置集合
db.createCollection('user_settings');
db.user_settings.createIndex({ userId: 1 }, { unique: true });

// 创建系统设置集合
db.createCollection('system_settings');

print('MongoDB初始化完成：已创建所有集合和索引'); 