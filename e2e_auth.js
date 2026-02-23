(async ()=>{
  const base = 'http://localhost:4000/api/auth'
  const email = `e2e+${Date.now()}@example.com`
  console.log('TEST EMAIL', email)
  try {
    console.log('\n1) REGISTER')
    let res = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'E2E User', email, password: 'Password123!' }),
    })
    console.log('REGISTER STATUS', res.status)
    const regText = await res.text()
    try { console.log('REGISTER BODY', JSON.stringify(JSON.parse(regText), null, 2)) } catch (e) { console.log('REGISTER RAW', regText) }
    if (res.status >= 400 && res.status !== 409) throw new Error('Register failed')

    console.log('\n2) LOGIN')
    res = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' }),
    })
    console.log('LOGIN STATUS', res.status)
    const loginText = await res.text()
    try { console.log('LOGIN BODY', JSON.stringify(JSON.parse(loginText), null, 2)) } catch (e) { console.log('LOGIN RAW', loginText) }
    let loginJson = {}
    try { loginJson = JSON.parse(loginText) } catch (e) {}
    const token = loginJson.token || (() => { try { return JSON.parse(regText).token } catch (e) { return null } })()
    if (!token) throw new Error('No token received')

    console.log('\n3) AUTH/ME')
    res = await fetch(`${base}/me`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } })
    console.log('ME STATUS', res.status)
    const meText = await res.text()
    try { console.log('ME BODY', JSON.stringify(JSON.parse(meText), null, 2)) } catch (e) { console.log('ME RAW', meText) }

    console.log('\nE2E test completed successfully')
  } catch (err) {
    console.error('E2E ERROR', err)
  }
})()
