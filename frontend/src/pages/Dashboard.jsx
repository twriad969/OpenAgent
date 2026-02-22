import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import ProjectCard from '../components/ProjectCard';

const starters = [
  'SaaS landing page with clear conversion flow',
  'Agency website with case studies and contact funnel',
  'Restaurant website with menu + reservation section',
  'Creator website with newsletter and testimonials'
];

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [me, setMe] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const [p, u] = await Promise.all([api.listProjects(), api.me()]);
    setProjects(p.projects);
    setMe(u.user);
  };

  useEffect(() => {
    load().catch(() => navigate('/'));
  }, [navigate]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.name} ${p.description || ''}`.toLowerCase().includes(q));
  }, [projects, query]);

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
    <main className="min-h-screen p-4 lg:p-6">
      <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[300px,1fr]">
        <aside className="panel surface-yellow h-fit p-4 lg:sticky lg:top-6">
          <h1 className="text-3xl">Projects</h1>
          <p className="mt-1 text-sm">{me?.email}</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="event-card p-3">Total projects: {projects.length}</div>
            <div className="event-card p-3">Filtered: {filteredProjects.length}</div>
          </div>
          <button className="btn mt-4 w-full" onClick={logout}>Logout</button>
        </aside>

        <section className="space-y-4">
          <form onSubmit={startFromPrompt} className="panel p-4">
            <h2 className="text-2xl">Start from a prompt</h2>
            <p className="mb-3 mt-1 text-sm text-[var(--muted)]">Describe what you want and jump directly to a live builder session.</p>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                className="input flex-1"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A modern SaaS landing page with pricing, testimonials, and contact form"
              />
              <button disabled={busy || !prompt.trim()} className="btn-primary disabled:opacity-50">{busy ? 'Preparing…' : 'Generate'}</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {starters.map((item) => (
                <button key={item} type="button" className="chip" onClick={() => setPrompt(item)}>{item}</button>
              ))}
            </div>
          </form>

          <section className="panel p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl">Recent projects</h2>
              <input
                className="input max-w-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
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
              {filteredProjects.length === 0 && <div className="panel p-4 text-sm text-[var(--muted)]">No projects match your search.</div>}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
