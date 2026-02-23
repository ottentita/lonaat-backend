import prisma from '../src/prisma'

async function main(){
  const users = await prisma.user.findMany({ take: 5 })
  console.log('USERS:', users.map(u=>({id:u.id,email:u.email})))
  process.exit(0)
}

main().catch(e=>{console.error(e); process.exit(1)})
