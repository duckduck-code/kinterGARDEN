// Only a last initial is stored (not a full last name), so "alphabetical by
// last name" sorts on that initial, falling back to first name to break ties.
export function byLastName(a, b) {
  return a.last_initial.localeCompare(b.last_initial) || a.first_name.localeCompare(b.first_name)
}
