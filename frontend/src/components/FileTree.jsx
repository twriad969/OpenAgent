function TreeNode({ node, level = 0 }) {
  if (node.type === 'file') {
    return (
      <li className="rounded px-2 py-1 hover:bg-[#f5f0e5]" style={{ paddingLeft: `${level * 14 + 8}px` }}>
        {node.name}
      </li>
    );
  }

  return (
    <li>
      <div className="rounded px-2 py-1 font-semibold" style={{ paddingLeft: `${level * 14 + 8}px` }}>
        {node.name}
      </div>
      {node.children?.length ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.path || `${node.name}-${child.name}`} node={child} level={level + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function FileTree({ tree }) {
  return (
    <section className="panel mt-4 h-[26vh] p-4">
      <h3 className="mb-2 text-sm font-semibold">Files</h3>
      <div className="h-[calc(100%-1.75rem)] overflow-auto text-xs">
        {!tree?.length ? (
          <div className="event-card text-[var(--muted)]">No generated files yet.</div>
        ) : (
          <ul className="space-y-1">
            {tree.map((node) => (
              <TreeNode key={node.path || node.name} node={node} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
