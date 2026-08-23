import { LEVELS } from '../lib/constants'

// R3.2.1 — one tap, always skippable. Tapping the already-selected level clears it.
export default function LevelPicker({ value, onChange }) {
  return (
    <div className="level-picker" role="group" aria-label="Growth level (optional)">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          className="level-chip"
          aria-pressed={value === level.value}
          onClick={() => onChange(value === level.value ? null : level.value)}
        >
          <span className="emoji">{level.emoji}</span>
          <span>{level.label}</span>
        </button>
      ))}
    </div>
  )
}
