import { useMemo, useState } from 'react';

const labels = {
  status: 'Status',
  tool_call: 'Tool',
  file_written: 'File',
  token: 'Token',
  done: 'Done',
  error: 'Error'
};

const filters = ['all', 'status', 'tool_call', 'file_written', 'token', 'done', 'error'];

export default function AgentActivity({ events, wsStatus, onClear }) {
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  return (
    <section className="panel emotional-enter h-[56vh] p-4">
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Live Activity</h3>
          <span className="badge">WS: {wsStatus}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              type="button"
              className={filter === f ? 'chip chip-active' : 'chip'}
            >
              {f === 'all' ? 'All' : labels[f]}
            </button>
          ))}
          <button onClick={onClear} type="button" className="ml-auto btn text-xs">
            Clear
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-4.75rem)] space-y-2 overflow-auto text-xs">
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-3 text-slate-500">No events yet for this filter.</div>
        )}

        {visible.map((event, index) => (
          <article key={`${event.timestamp || index}-${index}`} className="event-card emotional-enter">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">{labels[event.type] || event.type}</span>
              <span className="text-[10px] text-slate-400">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-slate-700">{event.message || event.content || event.path || event.tool || event.input || ''}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
