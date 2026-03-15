const request = require('superagent')
const app = require('../dist/src/index').default || require('../src/index').default

;(async () => {
  const server = app.listen(0)
  try {
    const email = `debuguser+${Date.now()}@example.com`
    const reg = await request.post(`http://127.0.0.1:${server.address().port}/api/auth/register`).send({ email, password: 'password' })
    console.log('register status', reg.status, 'body', reg.body)

    const login = await request.post(`http://127.0.0.1:${server.address().port}/api/auth/login`).send({ email, password: 'password' })
    console.log('login status', login.status, 'headers', login.headers)
    const cookies = login.headers['set-cookie']

    const flow = await request.post(`http://127.0.0.1:${server.address().port}/internal/test-token-flow`).set('Cookie', cookies)
    console.log('flow status', flow.status, 'body', flow.body)
  } catch (err) {
    if (err.response) {
      console.error('ERR RESPONSE', err.response.status, err.response.body)
    } else {
      console.error('ERR', err)
    }
  } finally {
    server.close()
  }
})()
