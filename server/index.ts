import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import jsforce from 'jsforce'
import fs from 'node:fs'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db, migrate } from './db.js'

migrate()

const app = express()
const PORT = Number(process.env.PORT || 4174)
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-before-production'
const APP_URL = process.env.APP_URL || `http://localhost:5173`
const API_URL = process.env.API_URL || `http://localhost:${PORT}`
const isProduction = process.env.NODE_ENV === 'production'

app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(cors({ origin: [APP_URL, 'http://localhost:5173', 'http://localhost:4173'], credentials: true }))

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(10).max(200),
})
const loginSchema = z.object({ email: z.string().email().transform((v) => v.toLowerCase().trim()), password: z.string().min(1) })
const projectSchema = z.object({ name: z.string().min(2).max(120), team: z.string().min(2).max(80), description: z.string().max(1000).default('') })
const taskSchema = z.object({ projectId: z.string(), title: z.string().min(2).max(180), owner: z.string().max(80).default('Unassigned'), status: z.enum(['Backlog', 'In progress', 'Review', 'Done']).default('Backlog'), priority: z.enum(['Low', 'Medium', 'High']).default('Medium'), due: z.string().max(40).default('') })

type User = { id: string; email: string; name: string; verified_at: string | null }

function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, verified: Boolean(user.verified_at) }
}

function setSession(res: express.Response, user: User) {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie('bymycar_session', token, { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 7 * 24 * 60 * 60 * 1000 })
}

function auth(requiredVerified = true): express.RequestHandler {
  return (req, res, next) => {
    try {
      const token = req.cookies?.bymycar_session
      if (!token) return res.status(401).json({ error: 'Authentication required.' })
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
      const user = db.prepare('SELECT id, email, name, verified_at FROM users WHERE id = ?').get(payload.sub) as User | undefined
      if (!user) return res.status(401).json({ error: 'Invalid session.' })
      if (requiredVerified && !user.verified_at) return res.status(403).json({ error: 'Verify your email before accessing the platform.' })
      ;(req as express.Request & { user: User }).user = user
      next()
    } catch {
      res.status(401).json({ error: 'Invalid session.' })
    }
  }
}

async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${API_URL}/api/auth/verify?token=${encodeURIComponent(token)}`
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f7fb;padding:32px">
      <div style="max-width:560px;margin:auto;background:rgba(255,255,255,.92);border:1px solid #dfe8f3;border-radius:28px;padding:34px;box-shadow:0 30px 80px rgba(20,35,60,.14)">
        <div style="font-size:13px;font-weight:800;color:#0071e3;text-transform:uppercase;letter-spacing:.08em">BYmyCAR Projects</div>
        <h1 style="font-size:34px;line-height:1;margin:14px 0 12px;color:#0b1020">Verify your secure workspace account</h1>
        <p style="font-size:16px;color:#536075;line-height:1.55">Click the button below to verify your BYmyCAR email address and unlock the project management platform.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin-top:22px;background:#0071e3;color:white;text-decoration:none;border-radius:999px;padding:15px 22px;font-weight:800">Verify my account</a>
        <p style="font-size:13px;color:#7b8798;margin-top:24px">This link expires in 24 hours. If the button does not work, copy this URL:<br>${verifyUrl}</p>
      </div>
    </div>`
  const text = `Verify your BYmyCAR Projects account: ${verifyUrl}`

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transporter.sendMail({ from: process.env.SMTP_FROM || 'BYmyCAR Projects <no-reply@bymycar.fr>', to: email, subject: 'Verify your BYmyCAR Projects account', html, text })
    return
  }

  if (process.env.SALESFORCE_EMAIL_ENABLED === 'true') {
    const conn = new jsforce.Connection({ loginUrl: process.env.SALESFORCE_LOGIN_URL || process.env.SALESFORCE_DOMAIN || 'https://login.salesforce.com' })
    await conn.login(process.env.SALESFORCE_USERNAME || '', `${process.env.SALESFORCE_PASSWORD || ''}${process.env.SALESFORCE_SECURITY_TOKEN || ''}`)
    await conn.requestPost('/services/data/v59.0/actions/standard/emailSimple', {
      inputs: [{
        emailAddresses: email,
        emailSubject: 'Verify your BYmyCAR Projects account',
        emailBody: html,
        senderType: 'CurrentUser',
      }],
    })
    return
  }

  console.log(`\n[BYmyCAR verification link for ${email}] ${verifyUrl}\n`)
}

function loadDesktopCredentialsIntoEnv() {
  const credentialsPath = '/Users/john/Desktop/credentials.json'
  if (process.env.SALESFORCE_EMAIL_ENABLED || !fs.existsSync(credentialsPath)) return
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    const salesforce = credentials.salesforce_prod
    if (salesforce?.username && salesforce?.password && salesforce?.security_token && salesforce?.domain) {
      process.env.SALESFORCE_EMAIL_ENABLED = 'true'
      process.env.SALESFORCE_DOMAIN = salesforce.domain
      process.env.SALESFORCE_LOGIN_URL = salesforce.domain.replace('.lightning.force.com/', '.my.salesforce.com/')
      process.env.SALESFORCE_USERNAME = salesforce.username
      process.env.SALESFORCE_PASSWORD = salesforce.password
      process.env.SALESFORCE_SECURITY_TOKEN = salesforce.security_token
    }
  } catch (error) {
    console.warn('Could not load desktop credentials for Salesforce email delivery.', error)
  }
}

loadDesktopCredentialsIntoEnv()

function seedWorkspace(user: User) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM projects WHERE owner_id = ?').get(user.id) as { count: number }
  if (existing.count > 0) return
  const projectId = nanoid()
  db.prepare('INSERT INTO projects (id, name, team, description, owner_id, progress, health) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(projectId, 'BDC transformation', 'Sales Ops', 'Launch verified project execution across BYmyCAR teams.', user.id, 45, 'Focused')
  db.prepare('INSERT INTO memberships (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, user.id, 'owner')
  const tasks = [
    ['Finalize Salesforce attribution map', user.name, 'In progress', 'High', 'Today'],
    ['Review call routing blueprint', user.name, 'Review', 'Medium', 'Jun 14'],
    ['Publish executive dashboard', user.name, 'Backlog', 'High', 'Jun 18'],
  ]
  const insertTask = db.prepare('INSERT INTO tasks (id, project_id, title, owner, status, priority, due) VALUES (?, ?, ?, ?, ?, ?, ?)')
  for (const task of tasks) insertTask.run(nanoid(), projectId, ...task)
  db.prepare('INSERT INTO activity (id, project_id, actor_id, message) VALUES (?, ?, ?, ?)').run(nanoid(), projectId, user.id, `${user.name} created the first secure project workspace.`)
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid signup details.' })
  const { name, email, password } = parsed.data
  if (!email.endsWith('@bymycar.fr')) return res.status(403).json({ error: 'Only @bymycar.fr email addresses can sign up.' })
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ error: 'An account already exists for this email.' })
  const id = nanoid()
  const hash = await bcrypt.hash(password, 12)
  db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)').run(id, email, name, hash)
  const token = nanoid(48)
  db.prepare('INSERT INTO verification_tokens (token, user_id, expires_at) VALUES (?, ?, datetime(\'now\', \'+24 hours\'))').run(token, id)
  await sendVerificationEmail(email, token)
  res.status(201).json({ ok: true, message: 'Account created. Check your email for the verification link.' })
})

app.get('/api/auth/verify', (req, res) => {
  const token = String(req.query.token || '')
  const row = db.prepare('SELECT token, user_id, expires_at, used_at FROM verification_tokens WHERE token = ?').get(token) as { user_id: string; expires_at: string; used_at: string | null } | undefined
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return res.status(400).send('Verification link is invalid or expired.')
  db.prepare('UPDATE users SET verified_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.user_id)
  db.prepare('UPDATE verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = ?').run(token)
  const user = db.prepare('SELECT id, email, name, verified_at FROM users WHERE id = ?').get(row.user_id) as User
  seedWorkspace(user)
  setSession(res, user)
  res.redirect(`${APP_URL}/?verified=1`)
})

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid login details.' })
  const user = db.prepare('SELECT id, email, name, password_hash, verified_at FROM users WHERE email = ?').get(parsed.data.email) as (User & { password_hash: string }) | undefined
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' })
  if (!user.verified_at) return res.status(403).json({ error: 'Verify your email before signing in.' })
  seedWorkspace(user)
  setSession(res, user)
  res.json({ user: publicUser(user) })
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('bymycar_session')
  res.json({ ok: true })
})

app.get('/api/me', auth(false), (req, res) => res.json({ user: publicUser((req as express.Request & { user: User }).user) }))

type ProjectRow = { id: string; name: string; team: string; description: string; owner_id: string; progress: number; health: string; created_at: string }

app.get('/api/projects', auth(), (req, res) => {
  const user = (req as express.Request & { user: User }).user
  const projects = db.prepare(`SELECT p.* FROM projects p JOIN memberships m ON m.project_id = p.id WHERE m.user_id = ? ORDER BY p.created_at DESC`).all(user.id) as ProjectRow[]
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC')
  res.json({ projects: projects.map((project) => ({ ...project, tasks: tasks.all(project.id) })) })
})

app.post('/api/projects', auth(), (req, res) => {
  const parsed = projectSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid project.' })
  const user = (req as express.Request & { user: User }).user
  const id = nanoid()
  db.prepare('INSERT INTO projects (id, name, team, description, owner_id) VALUES (?, ?, ?, ?, ?)').run(id, parsed.data.name, parsed.data.team, parsed.data.description, user.id)
  db.prepare('INSERT INTO memberships (project_id, user_id, role) VALUES (?, ?, ?)').run(id, user.id, 'owner')
  db.prepare('INSERT INTO activity (id, project_id, actor_id, message) VALUES (?, ?, ?, ?)').run(nanoid(), id, user.id, `${user.name} created ${parsed.data.name}.`)
  res.status(201).json({ id })
})

app.post('/api/tasks', auth(), (req, res) => {
  const parsed = taskSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid task.' })
  const user = (req as express.Request & { user: User }).user
  const member = db.prepare('SELECT 1 FROM memberships WHERE project_id = ? AND user_id = ?').get(parsed.data.projectId, user.id)
  if (!member) return res.status(403).json({ error: 'You do not have access to this project.' })
  const id = nanoid()
  db.prepare('INSERT INTO tasks (id, project_id, title, owner, status, priority, due) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, parsed.data.projectId, parsed.data.title, parsed.data.owner, parsed.data.status, parsed.data.priority, parsed.data.due)
  db.prepare('INSERT INTO activity (id, project_id, actor_id, message) VALUES (?, ?, ?, ?)').run(nanoid(), parsed.data.projectId, user.id, `${user.name} added task: ${parsed.data.title}.`)
  res.status(201).json({ id })
})

app.get('/api/activity', auth(), (req, res) => {
  const user = (req as express.Request & { user: User }).user
  const rows = db.prepare(`SELECT a.* FROM activity a LEFT JOIN projects p ON p.id = a.project_id LEFT JOIN memberships m ON m.project_id = p.id WHERE m.user_id = ? OR a.actor_id = ? ORDER BY a.created_at DESC LIMIT 30`).all(user.id, user.id)
  res.json({ activity: rows })
})

app.listen(PORT, () => console.log(`BYmyCAR Projects API running on ${API_URL}`))
