import axios from 'axios'

async function run() {
  try {
    const base = 'http://localhost:4000'

    const health = await axios.get(`${base}/api/health`)
    console.log('/api/health status:', health.status)

    const loginResp = await axios.post(`${base}/api/auth/login`, { email: 'titasembi@gmail.com', password: 'Far@el11' })
    console.log('/api/auth/login response status:', loginResp.status)
    console.log('login body:', { user: loginResp.data.user, tokenPresent: !!loginResp.data.token })

    if (loginResp.data.token) {
      try {
        const decoded = require('jsonwebtoken').decode(loginResp.data.token)
        console.log('decoded token payload:', decoded)
      } catch (err) {
        console.error('Failed to decode token:', err)
      }
    }
  } catch (err: any) {
    if (err.response) {
      console.error('Request failed:', err.response.status, err.response.data)
    } else {
      console.error('Request error:', err.message || err)
    }
    process.exit(1)
  }
}

run()
