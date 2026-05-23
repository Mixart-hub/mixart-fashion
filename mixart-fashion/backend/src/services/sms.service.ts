import https from 'https'

class SmsService {
  private token: string | null = null

  async authenticate() {
    // Eskiz.uz auth
    const body = JSON.stringify({
      email: process.env.ESKIZ_EMAIL,
      password: process.env.ESKIZ_PASSWORD
    })
    return new Promise<void>((resolve, reject) => {
      const req = https.request({
        hostname: 'notify.eskiz.uz',
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
      }, (res) => {
        let data = ''
        res.on('data', (d) => data += d)
        res.on('end', () => {
          this.token = JSON.parse(data)?.data?.token
          resolve()
        })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }

  async send(phone: string, text: string) {
    if (!this.token) await this.authenticate()
    const body = JSON.stringify({ mobile_phone: phone, message: text, from: '4546' })
    return new Promise<void>((resolve, reject) => {
      const req = https.request({
        hostname: 'notify.eskiz.uz',
        path: '/api/message/sms/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
          Authorization: `Bearer ${this.token}`
        }
      }, (res) => {
        res.on('data', () => {})
        res.on('end', resolve)
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }
}

export const smsService = new SmsService()
