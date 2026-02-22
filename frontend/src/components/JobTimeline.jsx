export default function JobTimeline({ jobs }) {
  return (
    <section className="panel emotional-enter mt-4 h-[24vh] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent prompts</h3>
        <span className="badge surface-green">{jobs.length}</span>
      </div>
      <div className="h-[calc(100%-2rem)] space-y-2 overflow-auto text-xs">
        {jobs.length === 0 && <div className="event-card text-[var(--muted)]">No prompts yet.</div>}
        {jobs.map((job) => (
          <div key={job.id} className="event-card">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{job.status}</span>
              <span className="text-[10px] text-[var(--muted)]">{new Date(job.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-[var(--muted)]">{job.prompt}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
