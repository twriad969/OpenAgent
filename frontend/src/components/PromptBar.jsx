const suggestions = [
  'Simplify hero copy and sharpen CTA hierarchy',
  'Create a clean pricing table with one featured tier',
  'Improve mobile layout and spacing rhythm',
  'Add social proof strip and FAQ section'
];

export default function PromptBar({ value, onChange, onSubmit, generating, inputRef }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button key={item} className="chip" type="button" onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="panel emotional-enter flex items-center gap-2 p-3">
        <div className={`pulse-dot h-2.5 w-2.5 rounded-full ${generating ? 'bg-rose-500' : 'bg-emerald-500'}`} />
        <input
          ref={inputRef}
          className="input flex-1"
          placeholder="Tell the agent what to change next…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={generating}
        />
        <button disabled={generating || !value.trim()} className="btn-primary disabled:opacity-50">
          {generating ? 'Thinking…' : 'Run'}
        </button>
      </form>
    </div>
  );
}
