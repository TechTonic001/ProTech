require('dotenv').config()
const db = require('./db')
const bcrypt = require('bcryptjs')

const seedAdmin = async () => {
  try {
    const username  = process.env.ADMIN_USERNAME
    const full_name = process.env.ADMIN_FULL_NAME
    const email     = process.env.ADMIN_EMAIL
    const phone     = process.env.ADMIN_PHONE
    const password  = process.env.ADMIN_PASSWORD

    if (!username || !full_name || !email || !phone || !password) {
      console.warn('⚠️  Admin seed skipped — missing env vars')
      return
    }

    const [existing] = await db.query(
      'SELECT user_id, role FROM users WHERE email = $1',
      [email]
    )

    if (existing.length > 0) {
      if (existing[0].role !== 'admin') {
        await db.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email])
        console.log('✅ Fixed role to admin for:', email)
      } else {
        console.log('ℹ️  Admin already exists — skipping')
      }
      return
    }

    const password_hash = await bcrypt.hash(password, 10)

    const [rows] = await db.query(
      `INSERT INTO users
        (username, full_name, email, phone_number,
         password_hash, role, is_approved)
       VALUES ($1,$2,$3,$4,$5,'admin',1)
       RETURNING user_id`,
      [username, full_name, email, phone, password_hash]
    )

    console.log('✅ Admin created — user_id:', rows[0].user_id, 'email:', email)

  } catch (err) {
    console.error('[SEED ADMIN ERROR]', err.message)
  }
}

module.exports = seedAdmin
