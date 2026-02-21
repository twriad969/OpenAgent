export default function JobTimeline({ jobs }) {
  return (
    <section className="panel emotional-enter mt-4 h-[24vh] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">Recent Prompts</h3>
        <span className="badge">{jobs.length}</span>
      </div>
      <div className="h-[calc(100%-2rem)] overflow-auto space-y-2 text-xs">
        {jobs.length === 0 && <div className="text-[#a89f92]">No prompts yet.</div>}
        {jobs.map((job) => (
          <div key={job.id} className="event-card">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-[#ddd2be]">{job.status}</span>
              <span className="text-[10px] text-[#887f71]">{new Date(job.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-[#c6bcad]">{job.prompt}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
