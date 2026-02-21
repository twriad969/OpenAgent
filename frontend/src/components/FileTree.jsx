function TreeNode({ node, level = 0 }) {
  if (node.type === 'file') {
    return (
      <li className="rounded px-2 py-1 text-[#c8beaf] hover:bg-[#2c2c2c]" style={{ paddingLeft: `${level * 14 + 8}px` }}>
        {node.name}
      </li>
    );
  }

  return (
    <li>
      <div className="rounded px-2 py-1 font-medium text-[#f2e8d8]" style={{ paddingLeft: `${level * 14 + 8}px` }}>
        {node.name}
      </div>
      {node.children?.length ? (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function FileTree({ tree }) {
  return (
    <section className="panel mt-4 h-[30vh] p-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">Files</h3>
      <div className="h-[calc(100%-1.75rem)] overflow-auto text-xs">
        {!tree?.length ? (
          <div className="rounded-lg border border-dashed border-[#4f4f4f] p-3 text-[#a89f92]">No generated files yet.</div>
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
