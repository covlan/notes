/**
 * 专门检查Share模型的依赖
 * 确保bcryptjs等模块可以正确加载
 */

console.log('开始检查Share模型依赖...');

try {
  // 先尝试加载bcryptjs
  const bcryptjs = require('bcryptjs');
  console.log('✅ bcryptjs 加载成功');
  
  console.log('测试bcryptjs功能...');
  const testSalt = bcryptjs.genSaltSync(10);
  const testHash = bcryptjs.hashSync('test', testSalt);
  const testVerify = bcryptjs.compareSync('test', testHash);
  
  if (testVerify) {
    console.log('✅ bcryptjs 功能正常');
  } else {
    console.error('❌ bcryptjs 功能测试失败');
    process.exit(1);
  }
  
  // 尝试加载mongoose
  const mongoose = require('mongoose');
  console.log('✅ mongoose 加载成功');
  
  // 尝试加载crypto
  const crypto = require('crypto');
  console.log('✅ crypto 加载成功');
  
  // 尝试直接加载Share模型
  console.log('尝试加载Share模型...');
  try {
    // 设置一个模拟的环境变量
    process.env.FRONTEND_URL = 'http://localhost:5660';
    
    const ShareModel = require('../src/models/Share');
    console.log('✅ Share模型加载成功');
    
    console.log('\n✅ 所有检查通过！Share模型可以正常使用');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Share模型加载失败: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ 依赖检查失败: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
} 