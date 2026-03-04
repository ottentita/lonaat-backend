const fs = require('fs');
const path = process.argv[2];
if(!path){console.error('Usage: node delimiter_check.js <file>'); process.exit(2)}
const s = fs.readFileSync(path, 'utf8');
let stack = [];
let inSingle=false, inDouble=false, inTemplate=false, inLineComment=false, inBlockComment=false, escaped=false;
for(let i=0;i<s.length;i++){
  const c=s[i];
  const prev = s[i-1];
  if(inLineComment){ if(c==='\n') inLineComment=false; continue; }
  if(inBlockComment){ if(prev==='*' && c==='/') inBlockComment=false; continue; }
  if(!inSingle && !inDouble && !inTemplate && c==='/' && s[i+1]==='/'){ inLineComment=true; i++; continue; }
  if(!inSingle && !inDouble && !inTemplate && c==='/' && s[i+1]==='*'){ inBlockComment=true; i++; continue; }
  if(!inSingle && !inDouble && !inTemplate && c==='`'){ inTemplate=true; stack.push({c:'`',i}); continue; }
  if(inTemplate){ if(c==='`' && !escaped){ stack.pop(); inTemplate=false; } if(c==='\\' && !escaped){ escaped=true; } else escaped=false; continue; }
  if(!inDouble && !inTemplate && c==="'"){ inSingle=true; stack.push({c:"'",i}); continue; }
  if(inSingle){ if(c==="'" && !escaped){ stack.pop(); inSingle=false; } if(c==='\\' && !escaped){ escaped=true; } else escaped=false; continue; }
  if(!inSingle && !inTemplate && c==='"'){ inDouble=true; stack.push({c:'"',i}); continue; }
  if(inDouble){ if(c==='"' && !escaped){ stack.pop(); inDouble=false; } if(c==='\\' && !escaped){ escaped=true; } else escaped=false; continue; }
  if(c==='('){stack.push({c:'(',i})}
  else if(c===')'){ if(stack.length && stack[stack.length-1].c==='(') stack.pop(); else {console.log('unmatched ) at',i); break}}
  else if(c==='{'){stack.push({c:'{',i})}
  else if(c==='}'){ if(stack.length && stack[stack.length-1].c==='{') stack.pop(); else {console.log('unmatched } at',i); break}}
  else if(c==='['){stack.push({c:'[',i})}
  else if(c===']'){ if(stack.length && stack[stack.length-1].c==='[') stack.pop(); else {console.log('unmatched ] at',i); break}}
}
console.log('stack tail',stack.slice(-10));
if(stack.length){
  console.log('Unclosed delimiters (last 10):');
  stack.slice(-10).forEach(it=>{
    const before = s.slice(Math.max(0,it.i-20),it.i+20).replace(/\n/g,'\\n');
    console.log(it.c,'at index',it.i,'context:',before);
  });
}
else console.log('No unclosed delimiters found');
