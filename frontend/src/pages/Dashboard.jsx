import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ProjectCard from '../components/ProjectCard';

const starters = [
  'SaaS landing page with dramatic hero and product storytelling',
  'High-end agency site with case studies and conversion-focused contact section',
  'Restaurant website with booking, menu categories, and elegant imagery layout',
  'Personal creator site with newsletter, testimonials, and premium visual tone'
];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [me, setMe] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const [p, u] = await Promise.all([api.listProjects(), api.me()]);
    setProjects(p.projects);
    setMe(u.user);
  };

  useEffect(() => {
    load().catch(() => navigate('/'));
  }, [navigate]);

  const startFromPrompt = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || busy) return;

    setBusy(true);
    try {
      const name = prompt.trim().slice(0, 60);
      const created = await api.createProject({ name, description: prompt.trim() });
      const id = created.project.id;
      navigate(`/project/${id}?q=${encodeURIComponent(prompt.trim())}`);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api.logout();
    localStorage.removeItem('lf_token');
    navigate('/');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="panel emotional-enter flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h1 className="text-4xl text-[var(--text)]">Start building</h1>
            <p className="text-sm text-[#b7ad9a]">{me?.email}</p>
          </div>
          <button className="btn" onClick={logout}>Logout</button>
        </header>

        <form onSubmit={startFromPrompt} className="panel emotional-enter p-4 space-y-3">
          <p className="text-sm font-medium text-[#ddd2be]">Describe your first version</p>
          <div className="flex gap-2">
            <input className="input flex-1" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A modern SaaS landing page with pricing, testimonials, and contact form" />
            <button disabled={busy || !prompt.trim()} className="btn-primary disabled:opacity-50">{busy ? 'Preparing…' : 'Generate'}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {starters.map((item) => (
              <button key={item} type="button" className="chip" onClick={() => setPrompt(item)}>
                {item}
              </button>
            ))}
          </div>
        </form>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#9f947f]">Recent Projects</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate(`/project/${project.id}`)}
                onDelete={async () => {
                  await api.deleteProject(project.id);
                  load();
                }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
