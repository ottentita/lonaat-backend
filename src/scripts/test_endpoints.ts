import axios from 'axios'

async function run() {
  try {
    const base = 'http://localhost:4000'

    const health = await axios.get(`${base}/api/health`)

    const loginResp = await axios.post(`${base}/api/auth/login`, { email: 'titasembi@gmail.com', password: 'Far@el11' })

    if (loginResp.data.token) {
      try {
        const decoded = require('jsonwebtoken').decode(loginResp.data.token)
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
