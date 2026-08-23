import { useEffect, useState } from 'react'

// R3.1.6 — drafts autosave to localStorage on every keystroke so a half-typed
// note survives a dropped connection or an accidental back-swipe.
const PREFIX = 'growth-tracker:draft:'

export function useDraft(key, initial) {
  const storageKey = PREFIX + key
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved !== null ? JSON.parse(saved) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // localStorage unavailable (private mode, quota) — draft just won't persist.
    }
  }, [storageKey, value])

  function clearDraft() {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setValue(initial)
  }

  return [value, setValue, clearDraft]
}
