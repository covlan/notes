/**
 * 依赖检查脚本
 * 用于验证所有必要的依赖是否可以正确加载
 */

console.log('开始检查依赖...');

// 要检查的依赖项列表
const dependencies = [
  'express',
  'mongoose',
  'bcryptjs',
  'jsonwebtoken',
  'cors',
  'dotenv',
  'multer',
  'crypto'
];

// 逐个检查依赖
let allDepsOK = true;
let failedDeps = [];

dependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep} - 加载成功`);
  } catch (error) {
    allDepsOK = false;
    failedDeps.push({ name: dep, error: error.message });
    console.error(`❌ ${dep} - 加载失败: ${error.message}`);
  }
});

// 总结
if (allDepsOK) {
  console.log('\n✅ 所有依赖检查通过！');
  process.exit(0);
} else {
  console.error('\n❌ 依赖检查失败！以下模块无法加载:');
  failedDeps.forEach(dep => {
    console.error(`   - ${dep.name}: ${dep.error}`);
  });
  console.log('\n请尝试重新安装依赖: npm install');
  process.exit(1);
} 