/**
 * 数据库状态监控脚本
 * 定期检查数据库状态，记录异常情况，并尝试自动恢复
 * 同时监控和显示活跃连接的实际命令
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// 配置
const CHECK_INTERVAL = 60000; // 检查间隔，默认1分钟
const ACTIVE_CONN_CHECK_INTERVAL = 5000; // 活跃连接检查间隔，默认5秒
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'db-monitor.log');
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5秒

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 颜色配置，用于控制台输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  // 根据日志级别输出不同颜色
  if (level === 'ERROR') {
    console.log(colors.fg.red + logMessage + colors.reset);
  } else if (level === 'WARN') {
    console.log(colors.fg.yellow + logMessage + colors.reset);
  } else if (level === 'DEBUG') {
    console.log(colors.fg.cyan + logMessage + colors.reset);
  } else {
    console.log(colors.fg.green + logMessage + colors.reset);
  }
  
  // 写入日志文件
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// 检查数据库状态
async function checkDatabaseStatus() {
  log('开始检查数据库状态...');
  
  // 检查连接状态
  if (mongoose.connection.readyState !== 1) {
    log(`数据库连接状态异常: ${mongoose.connection.readyState} (应为 1)`, 'ERROR');
    await reconnectDatabase();
    return;
  }
  
  try {
    // 检查用户集合是否存在
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    log(`数据库集合: ${collectionNames.join(', ')}`);
    
    const requiredCollections = ['users', 'notes', 'categories', 'tags', 'shares', 'user_settings', 'system_settings'];
    const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));
    
    if (missingCollections.length > 0) {
      log(`缺少必要的集合: ${missingCollections.join(', ')}`, 'ERROR');
      
      // 检查是否有初始化标记
      const initFlag = await mongoose.connection.db.collection('system_settings').findOne({ _id: "init_flag" });
      
      if (!initFlag) {
        log('未找到初始化标记，数据库可能未正确初始化', 'ERROR');
        log('尝试运行初始化脚本...', 'WARN');
        
        // 这里可以添加初始化数据库的逻辑
        // 注意：在生产环境中，应该非常谨慎地执行自动初始化
        // 建议发送警报并由管理员手动处理
      }
    } else {
      log('所有必要的集合都存在');
    }
    
    // 检查用户数量
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    log(`系统中的用户数量: ${userCount}`);
    
    if (userCount === 0) {
      log('系统中没有用户，可能是新安装或数据已被清空', 'WARN');
    }
    
    log('数据库状态检查完成');
  } catch (error) {
    log(`数据库检查出错: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    await reconnectDatabase();
  }
}

// 重新连接数据库
async function reconnectDatabase(retryCount = 0) {
  if (retryCount >= MAX_RETRIES) {
    log(`达到最大重试次数 ${MAX_RETRIES}，无法恢复数据库连接`, 'ERROR');
    return;
  }
  
  log(`尝试重新连接数据库 (尝试 ${retryCount + 1}/${MAX_RETRIES})...`);
  
  try {
    // 如果已连接，先断开
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      log('已关闭现有连接');
    }
    
    // 重新连接
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    
    log('数据库重新连接成功');
  } catch (error) {
    log(`重新连接失败: ${error.message}`, 'ERROR');
    
    // 延迟后重试
    log(`将在 ${RETRY_INTERVAL/1000} 秒后重试...`);
    setTimeout(() => reconnectDatabase(retryCount + 1), RETRY_INTERVAL);
  }
}

// 监控当前活跃连接和执行中的操作
async function monitorActiveConnections() {
  try {
    // 获取当前的数据库连接
    const db = mongoose.connection.db;
    
    // 使用admin数据库执行命令
    const adminDb = db.admin();
    
    // 获取当前服务器状态
    const serverStatus = await adminDb.serverStatus();
    const currentOps = await db.command({ currentOp: 1 });
    
    // 输出连接信息
    log(`数据库当前连接数: ${serverStatus.connections.current}`, 'INFO');
    log(`活跃连接数: ${serverStatus.connections.active}`, 'INFO');
    
    // 输出当前执行的操作
    if (currentOps.inprog && currentOps.inprog.length > 0) {
      const activeOps = currentOps.inprog.filter(op => !op.waitingForLock && op.op !== 'none');
      
      if (activeOps.length > 0) {
        log(`当前活跃操作数量: ${activeOps.length}`, 'INFO');
        
        // 详细列出每个操作
        activeOps.forEach((op, index) => {
          const opInfo = {
            操作类型: op.op,
            命令: op.command ? JSON.stringify(op.command) : 'N/A',
            集合: op.ns || 'N/A',
            客户端: op.client || 'N/A',
            连接ID: op.connectionId || 'N/A',
            已执行时间: op.microsecs_running ? `${(op.microsecs_running / 1000000).toFixed(2)}秒` : 'N/A',
            操作ID: op.opid || 'N/A'
          };
          
          log(`活跃操作 #${index + 1}: `, 'DEBUG');
          for (const [key, value] of Object.entries(opInfo)) {
            log(`  ${key}: ${value}`, 'DEBUG');
          }
        });
      } else {
        log('没有正在执行的活跃数据库操作', 'INFO');
      }
    } else {
      log('没有正在执行的数据库操作', 'INFO');
    }
    
    // 运行一个简单的查询测试
    await db.collection('system_settings').findOne({}, { _id: 1 });
    log('测试查询执行成功', 'DEBUG');
    
  } catch (error) {
    log(`监控数据库活跃连接出错: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
  }
}

// 直接连接到MongoDB监控活动
async function monitorMongoDirectly() {
  // 从环境变量中获取MongoDB连接URI
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    log('未找到MONGODB_URI环境变量，无法直接监控MongoDB', 'ERROR');
    return;
  }
  
  try {
    // 创建一个新的客户端连接
    const client = new MongoClient(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    await client.connect();
    log('已创建单独的MongoDB监控连接', 'INFO');
    
    const db = client.db();
    const adminDb = db.admin();
    
    // 获取正在执行的操作
    const currentOp = await db.command({ currentOp: 1 });
    
    // 筛选活跃操作
    const activeQueries = currentOp.inprog.filter(op => 
      op.op !== 'none' && 
      !op.waitingForLock && 
      op.ns && 
      !op.ns.startsWith('admin.') && 
      !op.ns.endsWith('.$cmd')
    );
    
    if (activeQueries.length > 0) {
      log(`检测到 ${activeQueries.length} 个活跃数据库命令:`, 'INFO');
      
      activeQueries.forEach((op, i) => {
        // 获取操作的详细信息
        const commandDetails = op.command ? JSON.stringify(op.command, null, 2) : '未知命令';
        const namespace = op.ns || '未知';
        const duration = op.microsecs_running ? `${(op.microsecs_running / 1000000).toFixed(2)}秒` : '未知';
        
        log(`命令 #${i + 1}:`, 'INFO');
        log(`数据库连接活跃`, 'INFO');
        log(`连接ID: ${op.connectionId || '未知'}`, 'INFO');
        log(`集合: ${namespace}`, 'INFO');
        log(`操作类型: ${op.op}`, 'INFO');
        log(`执行时间: ${duration}`, 'INFO');
        log(`实际命令:`, 'INFO');
        console.log(colors.fg.cyan + commandDetails + colors.reset);
        log('------------------------', 'INFO');
      });
    } else {
      log('数据库连接活跃，但目前没有正在执行的命令', 'INFO');
    }
    
    // 关闭客户端连接
    await client.close();
    log('已关闭监控连接', 'DEBUG');
    
  } catch (error) {
    log(`直接监控MongoDB出错: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
  }
}

// 初始化数据库连接
async function initDatabaseConnection() {
  log('初始化数据库连接...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    log('数据库连接成功');
    
    // 设置连接事件处理
    mongoose.connection.on('error', (err) => {
      log(`数据库连接错误: ${err.message}`, 'ERROR');
    });
    
    mongoose.connection.on('disconnected', () => {
      log('数据库连接断开', 'WARN');
    });
    
    // 立即进行一次检查
    await checkDatabaseStatus();
    
    // 设置定期检查数据库状态
    setInterval(checkDatabaseStatus, CHECK_INTERVAL);
    log(`已设置定期状态检查，间隔 ${CHECK_INTERVAL/1000} 秒`);
    
    // 首次运行活跃连接监控
    await monitorMongoDirectly();
    
    // 设置定期监控活跃连接
    setInterval(monitorMongoDirectly, ACTIVE_CONN_CHECK_INTERVAL);
    log(`已设置活跃连接监控，间隔 ${ACTIVE_CONN_CHECK_INTERVAL/1000} 秒`);
    
  } catch (error) {
    log(`初始化数据库连接失败: ${error.message}`, 'ERROR');
    log('将在5秒后重试...');
    setTimeout(initDatabaseConnection, 5000);
  }
}

// 启动监控
log('数据库监控脚本启动');
initDatabaseConnection();
