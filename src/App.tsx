import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Columns3,
  FileText,
  Link2,
  LockKeyhole,
  MailCheck,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users2,
} from 'lucide-react'
import './App.css'

type Task = {
  title: string
  owner: string
  status: 'Backlog' | 'In progress' | 'Review' | 'Done'
  priority: 'Low' | 'Medium' | 'High'
  due: string
}

type Project = {
  name: string
  team: string
  progress: number
  health: 'Calm' | 'Focused' | 'At risk'
  tasks: Task[]
}

const projects: Project[] = [
  {
    name: 'BDC transformation',
    team: 'Sales Ops',
    progress: 78,
    health: 'Focused',
    tasks: [
      { title: 'Finalize Salesforce attribution map', owner: 'Sarah', status: 'In progress', priority: 'High', due: 'Today' },
      { title: 'Review call routing blueprint', owner: 'John', status: 'Review', priority: 'Medium', due: 'Jun 14' },
      { title: 'Publish executive dashboard', owner: 'Nina', status: 'Done', priority: 'High', due: 'Jun 18' },
    ],
  },
  {
    name: 'Workshop capacity planner',
    team: 'After Sales',
    progress: 52,
    health: 'Calm',
    tasks: [
      { title: 'Share planning board with regions', owner: 'Mehdi', status: 'In progress', priority: 'Medium', due: 'Jun 17' },
      { title: 'Import availability model', owner: 'Clara', status: 'Backlog', priority: 'Low', due: 'Jun 21' },
      { title: 'Validate access groups', owner: 'Anaïs', status: 'Review', priority: 'High', due: 'Jun 19' },
    ],
  },
]

const activity = [
  'Anaïs shared a private roadmap with Direction Réseau',
  'John approved a milestone on BDC transformation',
  'Sarah uploaded a decision note and requested verification',
  'Mehdi moved 4 tasks to review for After Sales',
]

function App() {
  const [email, setEmail] = useState('')
  const [authStep, setAuthStep] = useState<'signup' | 'verify' | 'inside'>('signup')
  const [selectedProject, setSelectedProject] = useState(projects[0])

  const domainValid = useMemo(() => email.toLowerCase().trim().endsWith('@bymycar.fr'), [email])

  const submitSignup = () => {
    if (domainValid) setAuthStep('verify')
  }

  return (
    <main className="shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="grain" />

      <nav className="nav glass-panel">
        <div className="brand">
          <div className="brand-mark">B</div>
          <span>BYmyCAR Projects</span>
        </div>
        <div className="nav-links">
          <a href="#platform">Platform</a>
          <a href="#security">Security</a>
          <a href="#workspace">Workspace</a>
        </div>
        <button className="nav-cta" onClick={() => setAuthStep('signup')}>Sign in</button>
      </nav>

      <section className="hero-section" id="platform">
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className="eyebrow"><Sparkles size={16} /> Liquid glass project command center</div>
          <h1>Plan, share, verify and deliver work with executive clarity.</h1>
          <p className="hero-text">A premium project management platform for BYmyCAR teams: collaborative workspaces, secure sharing, deadline intelligence, files, comments, and verified company-only access.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setAuthStep('signup')}>Create secure account <ArrowRight size={18} /></button>
            <a className="secondary" href="#workspace">Preview workspace</a>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> @bymycar.fr only</span>
            <span><MailCheck size={17} /> email verification</span>
            <span><LockKeyhole size={17} /> private sharing</span>
          </div>
        </motion.div>

        <motion.div className="auth-card glass-panel" initial={{ opacity: 0, scale: 0.92, rotateX: 8 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ duration: 1, delay: 0.15 }}>
          <AnimatePresence mode="wait">
            {authStep === 'signup' && (
              <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="auth-icon"><LockKeyhole /></div>
                <h2>Company sign up</h2>
                <p>Access is restricted to verified BYmyCAR email addresses.</p>
                <label>Email address</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="firstname.lastname@bymycar.fr" />
                <div className={domainValid ? 'domain valid' : 'domain'}>{domainValid ? 'Domain accepted — verification ready' : 'Only @bymycar.fr emails can create an account'}</div>
                <button className="primary full" disabled={!domainValid} onClick={submitSignup}>Send verification link</button>
              </motion.div>
            )}
            {authStep === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="auth-icon success"><MailCheck /></div>
                <h2>Verify your account</h2>
                <p>A secure link is sent to <strong>{email}</strong>. In production this is enforced by Supabase Auth email confirmation and row-level security.</p>
                <button className="primary full" onClick={() => setAuthStep('inside')}>Demo verified access</button>
              </motion.div>
            )}
            {authStep === 'inside' && (
              <motion.div key="inside" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="auth-icon success"><CheckCircle2 /></div>
                <h2>Welcome inside</h2>
                <p>Your verified workspace is unlocked. Start creating private projects, tasks, milestones and shared decision rooms.</p>
                <button className="primary full" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Open workspace</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      <section className="feature-grid" id="security">
        {[
          { title: 'Verified identity', text: 'Enforce @bymycar.fr signup, email confirmation and protected workspace access.', Icon: ShieldCheck },
          { title: 'Project rooms', text: 'Invite teammates, share links, files, timelines, decisions and notes.', Icon: Users2 },
          { title: 'Live execution', text: 'Kanban, due dates, status, priorities, comments and activity streams.', Icon: Columns3 },
          { title: 'Executive signal', text: 'Health, progress and risks summarized in a calm leadership interface.', Icon: Bell },
        ].map(({ title, text, Icon }, i) => (
          <motion.div className="feature glass-panel" key={title} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
            <Icon />
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.div>
        ))}
      </section>

      <section className="workspace glass-panel" id="workspace">
        <div className="workspace-top">
          <div>
            <span className="eyebrow dark"><CalendarDays size={16} /> Today, executive workspace</span>
            <h2>One place for every project conversation.</h2>
          </div>
          <div className="toolbar"><Search size={18} /><span>Search projects, tasks, files</span><button><Plus size={17} /> New project</button></div>
        </div>

        <div className="dashboard">
          <aside className="sidebar">
            {projects.map((project) => (
              <button key={project.name} className={project.name === selectedProject.name ? 'project active' : 'project'} onClick={() => setSelectedProject(project)}>
                <span>{project.name}</span><small>{project.team} · {project.progress}%</small>
              </button>
            ))}
            <div className="share-box"><Link2 size={18} /><strong>Secure sharing</strong><p>Invite users, teams or generate expiring private links.</p></div>
          </aside>

          <div className="board">
            <div className="project-header">
              <div><h3>{selectedProject.name}</h3><p>{selectedProject.team} · health: {selectedProject.health}</p></div>
              <div className="progress-ring" style={{ '--progress': `${selectedProject.progress}%` } as React.CSSProperties}>{selectedProject.progress}%</div>
            </div>
            <div className="task-list">
              {selectedProject.tasks.map((task) => (
                <motion.article className="task-card" key={task.title} layout whileHover={{ y: -4, scale: 1.01 }}>
                  <div><strong>{task.title}</strong><span>{task.owner}</span></div>
                  <div className="task-meta"><em>{task.status}</em><span className={task.priority.toLowerCase()}>{task.priority}</span><span><Clock3 size={14} /> {task.due}</span></div>
                </motion.article>
              ))}
            </div>
          </div>

          <aside className="activity">
            <h3><MessageSquareText size={18} /> Live activity</h3>
            {activity.map((item) => <p key={item}>{item}</p>)}
            <div className="file-card"><FileText size={18} /><span>Q3 transformation brief.pdf</span></div>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default App
