import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
})

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html })
}

export function orderConfirmationEmail(orderId: string, total: number) {
  return {
    subject: `Order #${orderId.slice(0, 8)} confirmed`,
    html: `<h2>Thank you for your order!</h2><p>Total: ${(total / 100).toFixed(2)} UZS</p>`
  }
}
