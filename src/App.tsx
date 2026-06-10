import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock3,
  Columns3,
  FileText,
  Link2,
  LockKeyhole,
  LogOut,
  MailCheck,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users2,
} from 'lucide-react'
import './App.css'

type Task = { id: string; title: string; owner: string; status: 'Backlog' | 'In progress' | 'Review' | 'Done'; priority: 'Low' | 'Medium' | 'High'; due: string }
type Project = { id: string; name: string; team: string; description: string; progress: number; health: 'Calm' | 'Focused' | 'At risk'; tasks: Task[] }
type Activity = { id: string; message: string; created_at: string }
type User = { id: string; email: string; name: string; verified: boolean }

const API = ''

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

function App() {
  const [mode, setMode] = useState<'signup' | 'login' | 'verify' | 'inside'>('signup')
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [projectForm, setProjectForm] = useState({ name: '', team: '', description: '' })
  const [taskTitle, setTaskTitle] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const domainValid = useMemo(() => form.email.toLowerCase().trim().endsWith('@bymycar.fr'), [form.email])
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0]

  const loadWorkspace = async () => {
    const [projectData, activityData] = await Promise.all([
      api<{ projects: Project[] }>('/api/projects'),
      api<{ activity: Activity[] }>('/api/activity'),
    ])
    setProjects(projectData.projects)
    setActivity(activityData.activity)
    setSelectedProjectId((current) => current || projectData.projects[0]?.id || '')
  }

  useEffect(() => {
    api<{ user: User }>('/api/me')
      .then(async ({ user }) => {
        if (user.verified) {
          setUser(user)
          setMode('inside')
          await loadWorkspace()
        }
      })
      .catch(() => undefined)
  }, [])

  const signup = async () => {
    setLoading(true); setError(''); setMessage('')
    try {
      const result = await api<{ message: string }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(form) })
      setMessage(result.message)
      setMode('verify')
    } catch (err) { setError(err instanceof Error ? err.message : 'Signup failed') }
    finally { setLoading(false) }
  }

  const login = async () => {
    setLoading(true); setError(''); setMessage('')
    try {
      const result = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: form.email, password: form.password }) })
      setUser(result.user)
      setMode('inside')
      await loadWorkspace()
    } catch (err) { setError(err instanceof Error ? err.message : 'Login failed') }
    finally { setLoading(false) }
  }

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null); setProjects([]); setActivity([]); setMode('login')
  }

  const createProject = async () => {
    if (!projectForm.name || !projectForm.team) return
    await api('/api/projects', { method: 'POST', body: JSON.stringify(projectForm) })
    setProjectForm({ name: '', team: '', description: '' })
    await loadWorkspace()
  }

  const createTask = async () => {
    if (!taskTitle || !selectedProject) return
    await api('/api/tasks', { method: 'POST', body: JSON.stringify({ projectId: selectedProject.id, title: taskTitle, owner: user?.name || 'Unassigned', status: 'Backlog', priority: 'Medium', due: 'This week' }) })
    setTaskTitle('')
    await loadWorkspace()
  }

  return (
    <main className="shell">
      <div className="aurora aurora-one" /><div className="aurora aurora-two" /><div className="grain" />
      <nav className="nav glass-panel">
        <div className="brand"><div className="brand-mark">B</div><span>BYmyCAR Projects</span></div>
        <div className="nav-links"><a href="#platform">Platform</a><a href="#security">Security</a><a href="#workspace">Workspace</a></div>
        {user ? <button className="nav-cta" onClick={logout}><LogOut size={16} /> Logout</button> : <button className="nav-cta" onClick={() => setMode('login')}>Sign in</button>}
      </nav>

      <section className="hero-section" id="platform">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className="eyebrow"><Sparkles size={16} /> Real production workspace</div>
          <h1>Plan, share, verify and deliver work with executive clarity.</h1>
          <p className="hero-text">A real authenticated project platform for BYmyCAR teams, backed by SQLite, secure password hashing, JWT sessions, email verification tokens, private project data and protected APIs.</p>
          <div className="hero-actions"><button className="primary" onClick={() => setMode(user ? 'inside' : 'signup')}>{user ? 'Open workspace' : 'Create secure account'} <ArrowRight size={18} /></button><a className="secondary" href="#workspace">Workspace</a></div>
          <div className="trust-row"><span><ShieldCheck size={17} /> @bymycar.fr only</span><span><MailCheck size={17} /> token verification</span><span><LockKeyhole size={17} /> private database</span></div>
        </motion.div>

        {!user && <motion.div className="auth-card glass-panel" initial={{ opacity: 0, scale: 0.92, rotateX: 8 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ duration: 1, delay: 0.15 }}>
          <AnimatePresence mode="wait">
            {mode === 'signup' && <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="auth-icon"><LockKeyhole /></div><h2>Create account</h2><p>Real accounts are stored securely. Only verified @bymycar.fr emails can enter.</p>
              <label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              <label>Email address</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="firstname.lastname@bymycar.fr" />
              <label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 10 characters" />
              <div className={domainValid ? 'domain valid' : 'domain'}>{domainValid ? 'Domain accepted' : 'Only @bymycar.fr emails can create an account'}</div>
              {error && <div className="error">{error}</div>}{message && <div className="success-msg">{message}</div>}
              <button className="primary full" disabled={!domainValid || loading} onClick={signup}>{loading ? 'Creating...' : 'Create & send verification'}</button>
              <button className="link-button" onClick={() => setMode('login')}>Already verified? Sign in</button>
            </motion.div>}
            {mode === 'login' && <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="auth-icon"><ShieldCheck /></div><h2>Sign in</h2><p>Use your verified BYmyCAR account.</p>
              <label>Email address</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="firstname.lastname@bymycar.fr" />
              <label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Your password" />
              {error && <div className="error">{error}</div>}
              <button className="primary full" disabled={loading} onClick={login}>{loading ? 'Signing in...' : 'Sign in'}</button>
              <button className="link-button" onClick={() => setMode('signup')}>Need an account?</button>
            </motion.div>}
            {mode === 'verify' && <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="auth-icon success"><MailCheck /></div><h2>Verify email</h2><p>{message || 'Check your email for the verification link. The backend has generated a secure token and will unlock access after verification.'}</p><button className="primary full" onClick={() => setMode('login')}>Go to sign in</button>
            </motion.div>}
          </AnimatePresence>
        </motion.div>}
      </section>

      <section className="feature-grid" id="security">
        {[{ title: 'Verified identity', text: 'Real server-side @bymycar.fr signup validation and verification tokens.', Icon: ShieldCheck }, { title: 'Project rooms', text: 'Projects and memberships persisted in a private SQLite database.', Icon: Users2 }, { title: 'Live execution', text: 'Create projects and tasks through authenticated backend APIs.', Icon: Columns3 }, { title: 'Executive signal', text: 'Activity and progress are stored and reloaded from the database.', Icon: Bell }].map(({ title, text, Icon }, i) => <motion.div className="feature glass-panel" key={title} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}><Icon /><h3>{title}</h3><p>{text}</p></motion.div>)}
      </section>

      <section className="workspace glass-panel" id="workspace">
        <div className="workspace-top"><div><span className="eyebrow dark"><CalendarDays size={16} /> {user ? `Signed in as ${user.name}` : 'Protected workspace'}</span><h2>{user ? 'Your real project database is live.' : 'Sign in to access private projects.'}</h2></div><div className="toolbar"><Search size={18} /><span>Search projects, tasks, files</span><button onClick={createProject}><Plus size={17} /> New project</button></div></div>
        {user && <div className="create-row"><input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Project name" /><input value={projectForm.team} onChange={(e) => setProjectForm({ ...projectForm, team: e.target.value })} placeholder="Team" /><input value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Description" /><button onClick={createProject}>Create</button></div>}
        {user && selectedProject ? <div className="dashboard">
          <aside className="sidebar">{projects.map((project) => <button key={project.id} className={project.id === selectedProject.id ? 'project active' : 'project'} onClick={() => setSelectedProjectId(project.id)}><span>{project.name}</span><small>{project.team} · {project.progress}%</small></button>)}<div className="share-box"><Link2 size={18} /><strong>Secure sharing</strong><p>Membership tables are ready for invite-based access control.</p></div></aside>
          <div className="board"><div className="project-header"><div><h3>{selectedProject.name}</h3><p>{selectedProject.team} · health: {selectedProject.health}</p></div><div className="progress-ring" style={{ '--progress': `${selectedProject.progress}%` } as React.CSSProperties}>{selectedProject.progress}%</div></div><div className="create-task"><input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Add a real task to the database" /><button onClick={createTask}>Add task</button></div><div className="task-list">{selectedProject.tasks.map((task) => <motion.article className="task-card" key={task.id} layout whileHover={{ y: -4, scale: 1.01 }}><div><strong>{task.title}</strong><span>{task.owner}</span></div><div className="task-meta"><em>{task.status}</em><span className={task.priority.toLowerCase()}>{task.priority}</span><span><Clock3 size={14} /> {task.due}</span></div></motion.article>)}</div></div>
          <aside className="activity"><h3><MessageSquareText size={18} /> Live activity</h3>{activity.map((item) => <p key={item.id}>{item.message}</p>)}<div className="file-card"><FileText size={18} /><span>Files area ready for S3/GitHub storage integration</span></div></aside>
        </div> : <div className="locked-state"><LockKeyhole /><h3>Authentication required</h3><p>Create and verify your account, then the private database workspace appears here.</p></div>}
      </section>
    </main>
  )
}

export default App
