const fs=require('fs'), es=require('esbuild');

const files = [
  'c:/Users/VONNEL/lonaat-backend/frontend/src/pages/admin/Dashboard.jsx',
  'c:/Users/VONNEL/lonaat-backend/frontend/src/pages/admin/Payments.jsx',
  'c:/Users/VONNEL/lonaat-backend/frontend/src/pages/admin/Withdrawals.jsx',
  'c:/Users/VONNEL/lonaat-backend/frontend/src/pages/user/Withdrawals.jsx',
  'c:/Users/VONNEL/lonaat-backend/frontend/src/pages/user/Transactions.jsx',
  'c:/Users/VONNEL/lonaat-backend/frontend/src/pages/user/OffersLeads.jsx'
];

console.log('Testing esbuild parse on all rebuilt files...\n');

let passed = 0;
let failed = 0;

files.forEach(file => {
  const name = file.split('/').pop();
  try{
    const content = fs.readFileSync(file,'utf8');
    es.transformSync(content,{loader:'jsx'});
    console.log(`✓ ${name} - PASS`);
    passed++;
  }catch(e){
    console.log(`✗ ${name} - FAIL: ${e.message.substr(0,100)}`);
    failed++;
  }
});

console.log(`\n${passed}/${files.length} files passed`);
process.exit(failed > 0 ? 1 : 0);
