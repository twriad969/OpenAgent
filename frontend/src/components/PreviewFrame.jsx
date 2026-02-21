export default function PreviewFrame({ src, loading }) {
  if (loading) {
    return (
      <section className="panel emotional-enter flex min-h-[72vh] items-center justify-center p-4">
        <div className="text-sm text-[#b3a995]">Crafting your preview…</div>
      </section>
    );
  }

  if (!src) {
    return (
      <section className="panel emotional-enter flex min-h-[72vh] items-center justify-center p-4">
        <div className="text-center text-[#b3a995]">
          <p className="text-base font-medium text-[var(--text)]">No preview yet</p>
          <p className="mt-1 text-sm">Send a prompt to create your first live version.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel emotional-enter min-h-[72vh] p-2">
      <iframe title="Project Preview" src={src} className="h-[72vh] w-full rounded-xl border border-[#3f3f3f] bg-white" />
    </section>
  );
}
