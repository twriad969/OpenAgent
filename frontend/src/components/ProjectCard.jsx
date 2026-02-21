export default function ProjectCard({ project, onOpen, onDelete }) {
  return (
    <div className="panel p-4">
      <h3 className="text-base font-semibold text-[var(--text)]">{project.name}</h3>
      <p className="mt-1 text-sm text-[#b7ad9a]">{project.description || 'No description'}</p>
      <p className="mt-3 text-xs text-[#918674]">Status: {project.status}</p>
      <div className="mt-4 flex gap-2">
        <button onClick={onOpen} className="btn-primary">Open</button>
        <button onClick={onDelete} className="btn">Delete</button>
      </div>
    </div>
  );
}
