const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Building frontend...');
  const result = execSync('npm run build', {
    cwd: path.join(__dirname, 'frontend'),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  
  if (result.includes('error') || result.includes('Error')) {
    console.log('BUILD FAILED');
    console.log(result);
    process.exit(1);
  } else {
    console.log('BUILD SUCCEEDED');
    console.log(result.slice(-500)); // Last 500 chars
  }
} catch (e) {
  console.log('BUILD ERROR');
  console.log(e.message);
  console.log(e.stdout || '');
  process.exit(1);
}
