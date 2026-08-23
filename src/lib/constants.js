export const LEVELS = [
  { value: 'emerging', label: 'Emerging', emoji: '🐛' },
  { value: 'developing', label: 'Developing', emoji: '🛡️' },
  { value: 'secure', label: 'Secure', emoji: '🦋' },
]

export const LEVEL_MAP = Object.fromEntries(LEVELS.map((l) => [l.value, l]))

export const TERMS = [
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
  { value: 'spring', label: 'Spring' },
]

export const AVATAR_COLORS = [
  '#FF4FA3',
  '#C8A2E8',
  '#A7D8F0',
  '#FFF6A9',
  '#E0218A',
  '#B7ECD1',
  '#FFC48C',
  '#9B5DE5',
]

// A big enough pool that a class of up to 25 can each get a distinct one.
export const AVATAR_EMOJIS = [
  '🦄', '🦕', '🌻', '🚀', '🦋', '🐢', '🌈', '🦁', '🦊', '🐼',
  '🐨', '🐘', '🐳', '🐙', '🐞', '🐝', '🐱', '🐶', '🐧', '🦉',
  '🐸', '🐰', '⭐', '✨', '🌸', '🍓', '🧁', '🤖', '🦖', '🐬',
]

export const QUIET_LIST_WINDOW_DAYS = 14

export const PINNED_CATEGORIES = [
  { value: 'allergy', label: 'Allergy', emoji: '⚠️', color: '#FF4FA3' },
  { value: 'plan', label: 'Plan / IEP', emoji: '📋', color: '#A7D8F0' },
  { value: 'special_needs', label: 'Special needs', emoji: '💜', color: '#C8A2E8' },
  { value: 'description', label: 'About them', emoji: '✨', color: '#FFF6A9' },
  { value: 'other', label: 'Other', emoji: '📌', color: '#D9DDE8' },
]

export const PINNED_CATEGORY_MAP = Object.fromEntries(PINNED_CATEGORIES.map((c) => [c.value, c]))

export const TEACHER_NOTE_CATEGORIES = [
  { value: 'idea', label: 'Idea', emoji: '💡', color: '#A7D8F0' },
  { value: 'went_well', label: 'Went well', emoji: '🌟', color: '#FFF6A9' },
  { value: 'to_improve', label: 'To change', emoji: '🔧', color: '#FF4FA3' },
  { value: 'routine', label: 'Routine', emoji: '🔁', color: '#C8A2E8' },
]

export const TEACHER_NOTE_CATEGORY_MAP = Object.fromEntries(TEACHER_NOTE_CATEGORIES.map((c) => [c.value, c]))
