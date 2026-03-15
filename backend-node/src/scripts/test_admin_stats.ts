import axios from 'axios'

async function run() {
  try {
    const base = 'http://localhost:4000'
    // login as admin
    const login = await axios.post(`${base}/api/auth/login`, { email: 'titasembi@gmail.com', password: 'Far@el11' })
    const token = login.data.token
    const resp = await axios.get(`${base}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
  } catch (err: any) {
    if (err.response) console.error('Request failed:', err.response.status, err.response.data)
    else console.error('Error:', err.message || err)
    process.exit(1)
  }
}

run()
