import { useEffect, useRef, useState } from 'react'

// Optimistic delete/archive pattern: the UI updates immediately, the actual
// mutation is delayed a few seconds behind an "Undo" button, and only fires
// for real once the window closes. Replaces window.confirm() for anything
// this covers — the undo window is the safety net, not a blocking dialog.
const DEFAULT_DELAY = 6000

export function useUndoToast() {
  const [message, setMessage] = useState(null)
  const timerRef = useRef(null)
  const pendingRef = useRef(null) // { onUndo, onCommit }

  function flushPending() {
    if (pendingRef.current) {
      clearTimeout(timerRef.current)
      pendingRef.current.onCommit()
      pendingRef.current = null
    }
  }

  function showUndoable(msg, { onUndo, onCommit, delay = DEFAULT_DELAY }) {
    flushPending() // an earlier pending action shouldn't linger once a new one starts
    pendingRef.current = { onUndo, onCommit }
    setMessage(msg)
    timerRef.current = setTimeout(() => {
      pendingRef.current?.onCommit()
      pendingRef.current = null
      setMessage(null)
    }, delay)
  }

  function handleUndo() {
    clearTimeout(timerRef.current)
    pendingRef.current?.onUndo()
    pendingRef.current = null
    setMessage(null)
  }

  // Leaving the page shouldn't silently lose the pending action — commit it
  // immediately rather than leave it in limbo.
  useEffect(() => () => flushPending(), [])

  const node = message ? (
    <div className="toast toast--undo" role="status">
      <span>{message}</span>
      <button className="toast__undo-btn" onClick={handleUndo}>
        Undo
      </button>
    </div>
  ) : null

  return [node, showUndoable]
}
