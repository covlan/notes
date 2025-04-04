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

// 初始化管理员账户
const adminExists = db.users.findOne({ username: 'admin' });

if (!adminExists) {
    // 创建一个明文密码用户，稍后在应用程序中使用API更改密码
    // 创建管理员用户 - 暂时使用一个简单明文标记，后续会通过API覆盖
    const adminUser = db.users.insertOne({
        username: 'admin',
        email: 'admin@example.com',
        password: 'PLAIN_TEXT_PASSWORD_NEEDS_UPDATE',
        displayName: '管理员',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    
    // 为管理员创建默认设置
    if (adminUser.acknowledged) {
        db.user_settings.insertOne({
            userId: adminUser.insertedId,
            theme: 'light',
            language: 'zh-CN',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        print('已创建管理员账户: 用户名=admin, 但密码需要通过API重置');
    }
}

print('MongoDB初始化完成：已创建所有集合和索引'); 