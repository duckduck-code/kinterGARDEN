export default function StudentAvatar({ student, size = 44 }) {
  return (
    <div
      className="student-avatar"
      style={{
        width: size,
        height: size,
        background: student.avatar_color ?? 'var(--lavender)',
        fontSize: size * 0.55,
      }}
    >
      {student.avatar_emoji ?? '🦋'}
    </div>
  )
}
