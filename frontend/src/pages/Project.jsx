import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-8" onClick={onClose}>
      <div className="panel emotional-enter w-full max-w-xl p-3" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 px-2 text-xs uppercase tracking-[0.2em] text-[#9f947f]">Quick actions</p>
        <div className="space-y-1">
          {actions.map((action) => (
            <button
              key={action.label}
              className="w-full rounded-xl border border-[#3a3a3a] bg-[#1c1c1c] px-3 py-2 text-left text-sm text-[#ddd2be] hover:border-[#565042]"
              onClick={() => {
                action.run();
                onClose();
              }}
            >
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
    let mounted = true;

    refreshJobsAndFiles()
      .then(() => {
        if (!mounted) return;
      })
      .catch((error) => {
        setEvents((prev) => [...prev, { type: 'error', message: error.message, timestamp: new Date().toISOString(), projectId: id }]);
      });

    const offStatus = wsManager.onStatus((status) => setWsStatus(status));

    const handleEvent = async (event) => {
      setEvents((prev) => [...prev.slice(-399), event]);

      if (['status', 'token', 'tool_call', 'file_written'].includes(event.type)) {
        setGenerating(true);
      }

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
      mounted = false;
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
    <main className="mx-auto min-h-screen max-w-[1700px] p-4 text-[var(--text)] lg:p-6">
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} actions={actions} />

      <header className="panel emotional-enter mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl">{project?.name || 'Builder'}</h1>
            <p className="text-sm text-[#b7ad9a]">{project?.description || 'Emotion-first minimal realtime builder.'}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge">{generating ? 'Generating…' : 'Idle'}</span>
            <span className="badge">Events: {events.length}</span>
            <span className="badge">Tokens: {tokenCount}</span>
            <span className="badge">⌘/Ctrl+K</span>
            <button className="btn" onClick={() => refreshPreviewUrl()}>Refresh Preview</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[420px,1fr]">
        <div>
          <AgentActivity events={events} wsStatus={wsStatus} onClear={() => setEvents([])} />
          <FileTree tree={fileTree} />
          <JobTimeline jobs={jobs} />
        </div>
        <PreviewFrame src={iframeSrc} loading={generating && !previewReady} />
      </section>

      <PromptBar value={prompt} onChange={setPrompt} onSubmit={onSubmit} generating={generating} inputRef={promptRef} />
    </main>
  );
}
