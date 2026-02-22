import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { wsManager } from '../ws';
import AgentActivity from '../components/AgentActivity';
import FileTree from '../components/FileTree';
import PreviewFrame from '../components/PreviewFrame';
import PromptBar from '../components/PromptBar';
import JobTimeline from '../components/JobTimeline';

function CommandPalette({ open, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-8" onClick={onClose}>
      <div className="panel surface-yellow w-full max-w-xl p-3" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 px-2 text-xs uppercase tracking-[0.2em]">Quick actions</p>
        <div className="space-y-1">
          {actions.map((action) => (
            <button key={action.label} className="btn w-full text-left" onClick={() => { action.run(); onClose(); }}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Project() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const promptRef = useRef(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [project, setProject] = useState(null);
  const [events, setEvents] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [jobs, setJobs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [fileTree, setFileTree] = useState([]);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const tokenCount = useMemo(() => events.filter((event) => event.type === 'token').length, [events]);

  const iframeSrc = useMemo(() => {
    if (!previewReady || !previewSrc) return '';
    const separator = previewSrc.includes('?') ? '&' : '?';
    return `${previewSrc}${separator}t=${reloadKey}`;
  }, [previewReady, previewSrc, reloadKey]);

  const refreshPreviewUrl = async () => {
    try {
      const previewData = await api.previewUrl(id);
      setPreviewSrc(previewData.url || '');
      setReloadKey(Date.now());
    } catch (error) {
      setEvents((prev) => [...prev, { type: 'error', message: error.message, timestamp: new Date().toISOString(), projectId: id }]);
    }
  };

  const refreshJobsAndFiles = async () => {
    const [projectData, fileData] = await Promise.all([api.getProject(id), api.getProjectFiles(id)]);
    setProject(projectData.project);
    setJobs(projectData.jobs || []);
    setFileTree(fileData.tree || []);

    if (projectData.project.preview_port) {
      setPreviewReady(true);
      await refreshPreviewUrl();
    } else {
      setPreviewReady(false);
      setPreviewSrc('');
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if (!typing && e.key === '/') {
        e.preventDefault();
        promptRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    refreshJobsAndFiles().catch((error) => {
      setEvents((prev) => [...prev, { type: 'error', message: error.message, timestamp: new Date().toISOString(), projectId: id }]);
    });

    const offStatus = wsManager.onStatus((status) => setWsStatus(status));

    const handleEvent = async (event) => {
      setEvents((prev) => [...prev.slice(-399), event]);
      if (['status', 'token', 'tool_call', 'file_written'].includes(event.type)) setGenerating(true);

      if (event.type === 'file_written') {
        try {
          const files = await api.getProjectFiles(id);
          setFileTree(files.tree || []);
        } catch {
          // ignore transient file-list failures
        }
      }

      if (event.type === 'done') {
        setGenerating(false);
        try {
          await refreshJobsAndFiles();
        } catch {
          // ignore transient refresh failures
        }
      }

      if (event.type === 'error') setGenerating(false);
    };

    wsManager.subscribe(id, handleEvent);

    return () => {
      offStatus();
      wsManager.unsubscribe(id, handleEvent);
    };
  }, [id]);

  useEffect(() => {
    const firstPrompt = searchParams.get('q');
    if (!firstPrompt || autoTriggered) return;

    async function boot() {
      try {
        setGenerating(true);
        await api.generate(id, firstPrompt);
        setAutoTriggered(true);
      } catch (error) {
        setGenerating(false);
        setEvents((prev) => [...prev, { type: 'error', message: error.message, timestamp: new Date().toISOString(), projectId: id }]);
      }
    }

    boot();
  }, [id, searchParams, autoTriggered]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || generating) return;

    try {
      setGenerating(true);
      await api.generate(id, prompt);
      setPrompt('');
    } catch (error) {
      setGenerating(false);
      setEvents((prev) => [...prev, { type: 'error', message: error.message, timestamp: new Date().toISOString(), projectId: id }]);
    }
  };

  const actions = [
    { label: 'Focus prompt input', run: () => promptRef.current?.focus() },
    { label: 'Refresh preview', run: () => refreshPreviewUrl() },
    { label: 'Clear activity stream', run: () => setEvents([]) },
    { label: 'Reload jobs & files', run: () => refreshJobsAndFiles() }
  ];

  return (
    <main className="min-h-screen p-4 lg:p-6">
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} actions={actions} />

      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[290px,1fr]">
        <aside className="panel surface-green h-fit p-4 lg:sticky lg:top-6">
          <button className="btn mb-3 w-full" onClick={() => navigate('/dashboard')}>← Back to projects</button>
          <h1 className="text-3xl leading-tight">{project?.name || 'Builder'}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{project?.description || 'Prompt-driven website generation'}</p>
          <div className="mt-4 grid gap-2 text-xs">
            <span className="badge">{generating ? 'Generating' : 'Idle'}</span>
            <span className="badge">Events {events.length}</span>
            <span className="badge">Tokens {tokenCount}</span>
            <span className="badge">⌘/Ctrl+K actions</span>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[380px,1fr]">
            <div>
              <AgentActivity events={events} wsStatus={wsStatus} onClear={() => setEvents([])} />
              <FileTree tree={fileTree} />
              <JobTimeline jobs={jobs} />
            </div>
            <PreviewFrame src={iframeSrc} loading={generating && !previewReady} />
          </div>

          <PromptBar value={prompt} onChange={setPrompt} onSubmit={onSubmit} generating={generating} inputRef={promptRef} />
        </section>
      </div>
    </main>
  );
}
