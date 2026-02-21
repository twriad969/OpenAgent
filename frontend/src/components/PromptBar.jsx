const suggestions = [
  'Make it more premium and modern',
  'Add pricing cards with annual/monthly toggle',
  'Create a contact form with backend validation',
  'Improve mobile spacing and typography'
];

export default function PromptBar({ value, onChange, onSubmit, generating }) {
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
        <div className={`pulse-dot h-2.5 w-2.5 rounded-full ${generating ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <input
          className="input flex-1"
          placeholder="What should the website feel like next?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={generating}
        />
        <button disabled={generating || !value.trim()} className="btn-primary disabled:opacity-50">
          {generating ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
