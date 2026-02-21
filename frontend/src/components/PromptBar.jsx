const suggestions = [
  'Make the hero more cinematic and emotional',
  'Add animated pricing comparison blocks',
  'Create polished form validation and success states',
  'Refine typography and spacing for mobile'
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
        <div className={`pulse-dot h-2.5 w-2.5 rounded-full ${generating ? 'bg-amber-400' : 'bg-lime-300'}`} />
        <input
          ref={inputRef}
          className="input flex-1"
          placeholder="Describe your next iteration…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={generating}
        />
        <button disabled={generating || !value.trim()} className="btn-primary disabled:opacity-50">
          {generating ? 'Thinking…' : 'Ship Prompt'}
        </button>
      </form>
    </div>
  );
}
