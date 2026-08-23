// R3.1.4 — optional, multi-select domain tags.
export default function DomainPicker({ domains, value, onChange }) {
  function toggle(id) {
    onChange(value.includes(id) ? value.filter((d) => d !== id) : [...value, id])
  }

  const visible = domains.filter((d) => !d.is_hidden)

  return (
    <div className="tag-row" role="group" aria-label="Domains (optional)">
      {visible.map((domain) => {
        const active = value.includes(domain.id)
        return (
          <button
            key={domain.id}
            type="button"
            className="tag"
            aria-pressed={active}
            onClick={() => toggle(domain.id)}
            style={{
              background: active ? domain.color : 'transparent',
              border: active ? 'none' : '2px solid var(--chrome)',
              color: active ? 'var(--ink)' : 'var(--ink-soft)',
              cursor: 'pointer',
            }}
          >
            {domain.icon} {domain.name}
          </button>
        )
      })}
    </div>
  )
}
