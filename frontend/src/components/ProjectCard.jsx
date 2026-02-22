export default function ProjectCard({ project, onOpen, onDelete }) {
  return (
    <article className="panel flex h-full flex-col p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--ink)]">{project.name}</h3>
        <span className="badge surface-blue">{project.status}</span>
      </div>
      <p className="flex-1 text-sm text-[var(--muted)]">{project.description || 'No description yet.'}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={onOpen} className="btn-primary">Open</button>
        <button onClick={onDelete} className="btn">Delete</button>
      </div>
    </article>
  );
}
