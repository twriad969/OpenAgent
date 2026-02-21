import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { wsManager } from '../ws';
import AgentActivity from '../components/AgentActivity';
import FileTree from '../components/FileTree';
import PreviewFrame from '../components/PreviewFrame';
import PromptBar from '../components/PromptBar';
import JobTimeline from '../components/JobTimeline';

export default function Project() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [events, setEvents] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [jobs, setJobs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [fileTree, setFileTree] = useState([]);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const tokenCount = useMemo(() => events.filter((event) => event.type === 'token').length, [events]);

  const iframeSrc = useMemo(() => {
    if (!previewReady) return '';
    return `/preview/${id}/?t=${reloadKey}`;
  }, [previewReady, id, reloadKey]);

  async function refreshJobsAndFiles() {
    const [projectData, fileData] = await Promise.all([api.getProject(id), api.getProjectFiles(id)]);
    setProject(projectData.project);
    setJobs(projectData.jobs || []);
    setFileTree(fileData.tree || []);

    if (projectData.project.preview_port) {
      setPreviewReady(true);
      setReloadKey(Date.now());
    }
  }

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

  return (
    <main className="mx-auto min-h-screen max-w-[1700px] p-4 text-slate-900 lg:p-6">
      <header className="panel emotional-enter mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{project?.name || 'Builder'}</h1>
            <p className="text-sm text-slate-600">{project?.description || 'Emotion-first minimal realtime builder.'}</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="badge">{generating ? 'Generating…' : 'Idle'}</span>
            <span className="badge">Events: {events.length}</span>
            <span className="badge">Tokens: {tokenCount}</span>
            <button className="btn" onClick={() => setReloadKey(Date.now())}>Refresh Preview</button>
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

      <PromptBar value={prompt} onChange={setPrompt} onSubmit={onSubmit} generating={generating} />
    </main>
  );
}
