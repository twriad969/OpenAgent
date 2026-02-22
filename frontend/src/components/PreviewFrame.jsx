export default function PreviewFrame({ src, loading }) {
  if (loading) {
    return (
      <section className="panel emotional-enter flex min-h-[70vh] items-center justify-center p-4">
        <div className="badge surface-yellow">Crafting your preview…</div>
      </section>
    );
  }

  if (!src) {
    return (
      <section className="panel emotional-enter flex min-h-[70vh] items-center justify-center p-4">
        <div className="text-center">
          <p className="text-base font-medium">No preview yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Send a prompt to create your first live version.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel emotional-enter min-h-[70vh] p-2">
      <iframe title="Project Preview" src={src} className="h-[70vh] w-full rounded-lg border-2 border-[#111] bg-white" />
    </section>
  );
}
