// Sample data and a matching in-memory "API" so the app's screens can be
// explored without a real Supabase session — useful while waiting on email
// rate limits, for visual review, or as a public demo. Always available in
// local dev (`import.meta.env.DEV`); on a production build it's off unless
// the deployment explicitly sets `VITE_ALLOW_PREVIEW=true` — a leaked
// production URL exposes nothing by default, same as the real login gate.

const PREVIEW_KEY = 'gt-preview-mode'

export function previewAllowed() {
  return import.meta.env.DEV || import.meta.env.VITE_ALLOW_PREVIEW === 'true'
}

export function isPreviewMode() {
  return previewAllowed() && typeof window !== 'undefined' && window.localStorage.getItem(PREVIEW_KEY) === '1'
}

export function enablePreviewMode() {
  if (!previewAllowed()) return
  window.localStorage.setItem(PREVIEW_KEY, '1')
  window.location.reload()
}

export function disablePreviewMode() {
  window.localStorage.removeItem(PREVIEW_KEY)
  window.location.reload()
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`
}

const SCHOOL_YEAR_ID = 'preview-year'

const schoolYear = {
  id: SCHOOL_YEAR_ID,
  label: 'Kindergarten 2026–2027',
  start_date: '2026-08-15',
  end_date: '2027-06-15',
  is_current: true,
  created_at: '2026-08-01T00:00:00.000Z',
}

const domains = [
  { id: 'd1', name: 'Literacy & Language', icon: '📖', color: '#C8A2E8', sort_order: 1, is_hidden: false },
  { id: 'd2', name: 'Math & Numbers', icon: '🔢', color: '#A7D8F0', sort_order: 2, is_hidden: false },
  { id: 'd3', name: 'Social & Emotional', icon: '💛', color: '#FFF6A9', sort_order: 3, is_hidden: false },
  { id: 'd4', name: 'Fine Motor', icon: '✂️', color: '#C8A2E8', sort_order: 4, is_hidden: false },
  { id: 'd5', name: 'Gross Motor', icon: '🏃', color: '#A7D8F0', sort_order: 5, is_hidden: false },
  { id: 'd6', name: 'Creative Expression', icon: '🎨', color: '#FFF6A9', sort_order: 6, is_hidden: false },
  { id: 'd7', name: 'Approaches to Learning', icon: '🔎', color: '#C8A2E8', sort_order: 7, is_hidden: false },
]

const units = [
  { id: 'u-d1-1', domain_id: 'd1', label: 'Unit 1 · Lesson 1', sort_order: 1 },
  { id: 'u-d1-2', domain_id: 'd1', label: 'Unit 1 · Lesson 2', sort_order: 2 },
  { id: 'u-d1-3', domain_id: 'd1', label: 'Unit 1 · Lesson 3', sort_order: 3 },
  { id: 'u-d2-1', domain_id: 'd2', label: 'Unit 1 · Lesson 1', sort_order: 1 },
  { id: 'u-d2-2', domain_id: 'd2', label: 'Unit 1 · Lesson 2', sort_order: 2 },
]

const students = [
  { id: 's1', first_name: 'Amelia', last_initial: 'R', avatar_color: '#FF4FA3', avatar_emoji: '🦄', sort_order: 1 },
  { id: 's2', first_name: 'Beckett', last_initial: 'T', avatar_color: '#A7D8F0', avatar_emoji: '🦕', sort_order: 2 },
  { id: 's3', first_name: 'Camila', last_initial: 'S', avatar_color: '#FFF6A9', avatar_emoji: '🌻', sort_order: 3 },
  { id: 's4', first_name: 'Diego', last_initial: 'M', avatar_color: '#C8A2E8', avatar_emoji: '🚀', sort_order: 4 },
  { id: 's5', first_name: 'Elowen', last_initial: 'K', avatar_color: '#9B5DE5', avatar_emoji: '🦋', sort_order: 5 },
  { id: 's6', first_name: 'Finn', last_initial: 'O', avatar_color: '#B7ECD1', avatar_emoji: '🐢', sort_order: 6 },
  { id: 's7', first_name: 'Grace', last_initial: 'L', avatar_color: '#FFC48C', avatar_emoji: '🌈', sort_order: 7 },
  { id: 's8', first_name: 'Hugo', last_initial: 'B', avatar_color: '#FF4FA3', avatar_emoji: '🦁', sort_order: 8 },
].map((s) => ({
  ...s,
  school_year_id: SCHOOL_YEAR_ID,
  status: 'active',
  private_notes: '',
  created_at: '2026-08-10T00:00:00.000Z',
}))

function makeObs(studentId, date, { level = null, domainIds = [], body, flagged = false, unitId = null }) {
  return {
    id: uid(),
    student_id: studentId,
    school_year_id: SCHOOL_YEAR_ID,
    body,
    level,
    unit_id: unitId,
    observed_on: date,
    is_flagged: flagged,
    photo_url: null,
    domainIds,
    created_at: `${date}T12:00:00.000Z`,
    updated_at: `${date}T12:00:00.000Z`,
  }
}

let observations = [
  makeObs('s1', '2026-08-16', { level: 'secure', domainIds: ['d1'], unitId: 'u-d1-3', body: 'Read the whole picture book aloud on her own, sounding out new words confidently.' }),
  makeObs('s1', '2026-08-19', { level: 'developing', domainIds: ['d3'], body: 'Shared crayons without being asked during art time.' }),
  makeObs('s1', '2026-08-21', { level: 'secure', domainIds: ['d2'], unitId: 'u-d2-2', body: 'Counted a group of 12 objects accurately without recounting.' }),

  makeObs('s2', '2026-08-16', { level: 'emerging', domainIds: ['d2'], unitId: 'u-d2-1', body: 'Starting to count objects one-to-one up to 5, still needs support past that.' }),
  makeObs('s2', '2026-08-18', { level: 'emerging', domainIds: ['d1'], unitId: 'u-d1-2', body: 'Needs a lot of prompting to identify letters, revisiting the alphabet chart together.' }),
  makeObs('s2', '2026-08-20', { domainIds: ['d5'], flagged: true, body: 'Loved obstacle course day — great balance on the beam.' }),
  makeObs('s2', '2026-08-21', { level: 'emerging', domainIds: ['d2'], unitId: 'u-d2-1', body: 'Still recounting the same group twice — going to try a smaller set next.' }),

  makeObs('s3', '2026-08-17', { level: 'secure', domainIds: ['d6'], body: 'Drew a detailed self-portrait with labeled body parts.' }),

  makeObs('s4', '2026-08-18', { level: 'developing', domainIds: ['d1', 'd7'], unitId: 'u-d1-3', body: 'Sat through the whole story time today, big improvement from last week.' }),

  makeObs('s5', '2026-08-15', { level: 'emerging', domainIds: ['d4'], body: 'Working on scissor grip — cutting along a straight line with help.' }),
  makeObs('s5', '2026-08-17', { level: 'developing', domainIds: ['d2'], unitId: 'u-d2-1', body: 'Matched numerals 1-5 to groups of objects with one hint.' }),
  makeObs('s5', '2026-08-19', { level: 'developing', domainIds: ['d1'], unitId: 'u-d1-2', body: 'Recognized 15 of 26 letters today, up from 10 last week.' }),
  makeObs('s5', '2026-08-21', { level: 'developing', domainIds: ['d4'], body: 'Cut out a circle shape mostly independently today!' }),

  makeObs('s6', '2026-08-19', { domainIds: ['d3'], body: 'Comforted a classmate who was upset without adult prompting.' }),

  makeObs('s7', '2026-08-16', { level: 'secure', domainIds: ['d2'], unitId: 'u-d2-1', body: 'Correctly matched numerals 1-10 to groups of objects.' }),

  makeObs('s8', '2026-08-20', { level: 'emerging', domainIds: ['d1'], unitId: 'u-d1-2', body: 'Recognizing letters in his name, working on the rest of the alphabet.', flagged: true }),
]

let summaries = [
  { id: uid(), student_id: 's1', school_year_id: SCHOOL_YEAR_ID, term: 'fall', body: 'Amelia has settled in beautifully and is already reading above grade level.', updated_at: '2026-08-20T00:00:00.000Z' },
  { id: uid(), student_id: 's5', school_year_id: SCHOOL_YEAR_ID, term: 'fall', body: 'Elowen is building fine motor confidence steadily — cutting and drawing are much stronger this month.', updated_at: '2026-08-20T00:00:00.000Z' },
]

let studentNotes = [
  { id: uid(), student_id: 's3', category: 'allergy', body: 'Severe peanut allergy — EpiPen in the front office.', created_at: '2026-08-10T00:00:00.000Z', updated_at: '2026-08-10T00:00:00.000Z' },
  { id: uid(), student_id: 's4', category: 'plan', body: 'IEP: extra time for transitions, visual schedule on desk.', created_at: '2026-08-10T00:00:00.000Z', updated_at: '2026-08-10T00:00:00.000Z' },
  { id: uid(), student_id: 's6', category: 'description', body: 'Quiet until he knows you, then very chatty. Loves dinosaurs and turtles.', created_at: '2026-08-10T00:00:00.000Z', updated_at: '2026-08-10T00:00:00.000Z' },
]

let teacherNotes = [
  { id: uid(), school_year_id: SCHOOL_YEAR_ID, category: 'went_well', body: 'The obstacle course for gross motor day was a huge hit — try again next month with a timer.', created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-08-20T00:00:00.000Z' },
  { id: uid(), school_year_id: SCHOOL_YEAR_ID, category: 'to_improve', body: 'Story time right after lunch is too chaotic — kids are wound up. Try moving it to first thing instead.', created_at: '2026-08-19T00:00:00.000Z', updated_at: '2026-08-19T00:00:00.000Z' },
  { id: uid(), school_year_id: SCHOOL_YEAR_ID, category: 'idea', body: 'Name-writing practice could double as a quick check-in — have them trace their name on the way to circle time.', created_at: '2026-08-17T00:00:00.000Z', updated_at: '2026-08-17T00:00:00.000Z' },
]

function byDateDesc(a, b) {
  return b.observed_on.localeCompare(a.observed_on) || b.created_at.localeCompare(a.created_at)
}

function withStudentInfo(o) {
  const s = students.find((s) => s.id === o.student_id)
  return { ...o, students: s ? { first_name: s.first_name, last_initial: s.last_initial } : null }
}

export const mock = {
  async getCurrentSchoolYear() {
    return schoolYear
  },
  async listSchoolYears() {
    return [schoolYear]
  },
  async createSchoolYear({ label, start_date, end_date }) {
    return { id: uid(), label, start_date, end_date, is_current: false, created_at: new Date().toISOString() }
  },
  async setCurrentSchoolYear() {
    return schoolYear
  },

  async listStudents(_schoolYearId, { includeArchived = false } = {}) {
    return students.filter((s) => includeArchived || s.status === 'active').slice().sort((a, b) => a.sort_order - b.sort_order)
  },
  async getStudent(id) {
    return students.find((s) => s.id === id)
  },
  async createStudent(student) {
    const s = { id: uid(), status: 'active', private_notes: '', sort_order: students.length + 1, created_at: new Date().toISOString(), ...student }
    students.push(s)
    return s
  },
  async updateStudent(id, patch) {
    const s = students.find((s) => s.id === id)
    if (s) Object.assign(s, patch)
    return s
  },
  async archiveStudent(id) {
    return mock.updateStudent(id, { status: 'archived' })
  },

  async listDomains({ includeHidden = true } = {}) {
    return domains.filter((d) => includeHidden || !d.is_hidden).slice().sort((a, b) => a.sort_order - b.sort_order)
  },
  async createDomain(domain) {
    const d = { id: uid(), is_hidden: false, sort_order: domains.length + 1, ...domain }
    domains.push(d)
    return d
  },
  async updateDomain(id, patch) {
    const d = domains.find((d) => d.id === id)
    if (d) Object.assign(d, patch)
    return d
  },
  async deleteDomain(id) {
    const i = domains.findIndex((d) => d.id === id)
    if (i >= 0) domains.splice(i, 1)
  },

  async listUnits() {
    return units.slice().sort((a, b) => a.sort_order - b.sort_order)
  },
  async createUnit(unit) {
    const u = { id: uid(), sort_order: units.length + 1, ...unit }
    units.push(u)
    return u
  },
  async updateUnit(id, patch) {
    const u = units.find((u) => u.id === id)
    if (u) Object.assign(u, patch)
    return u
  },
  async deleteUnit(id) {
    const i = units.findIndex((u) => u.id === id)
    if (i >= 0) units.splice(i, 1)
  },

  async listObservationsForStudent(studentId) {
    return observations.filter((o) => o.student_id === studentId).slice().sort(byDateDesc)
  },
  async listObservationsForSchoolYear() {
    return observations.slice().sort(byDateDesc)
  },
  async listFlaggedObservations() {
    return observations.filter((o) => o.is_flagged).map(withStudentInfo).sort(byDateDesc)
  },
  async searchObservations(_schoolYearId, term) {
    const t = term.toLowerCase()
    return observations.filter((o) => o.body.toLowerCase().includes(t)).map(withStudentInfo).sort(byDateDesc)
  },
  async createObservation({ domainIds = [], ...fields }) {
    const o = { id: uid(), is_flagged: false, photo_url: null, unit_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), domainIds, ...fields }
    observations.push(o)
    return o
  },
  async updateObservation(id, { domainIds, ...patch }) {
    const o = observations.find((o) => o.id === id)
    if (o) {
      Object.assign(o, patch)
      if (domainIds) o.domainIds = domainIds
      o.updated_at = new Date().toISOString()
    }
    return o
  },
  async deleteObservation(id) {
    observations = observations.filter((o) => o.id !== id)
  },
  async toggleObservationFlag(id, isFlagged) {
    return mock.updateObservation(id, { is_flagged: isFlagged })
  },
  async getObservationCountsSince(_schoolYearId, sinceISODate) {
    const counts = {}
    for (const o of observations) {
      if (o.observed_on >= sinceISODate) counts[o.student_id] = (counts[o.student_id] ?? 0) + 1
    }
    return counts
  },

  async listSummariesForStudent(studentId) {
    return summaries.filter((s) => s.student_id === studentId)
  },
  async upsertSummary({ student_id, school_year_id, term, body }) {
    let s = summaries.find((s) => s.student_id === student_id && s.term === term)
    if (!s) {
      s = { id: uid(), student_id, school_year_id, term, body, updated_at: new Date().toISOString() }
      summaries.push(s)
    } else {
      s.body = body
      s.updated_at = new Date().toISOString()
    }
    return s
  },

  async listPinnedNotes(studentId) {
    return studentNotes.filter((n) => n.student_id === studentId)
  },
  async createPinnedNote({ student_id, category, body }) {
    const n = { id: uid(), student_id, category, body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    studentNotes.push(n)
    return n
  },
  async updatePinnedNote(id, patch) {
    const n = studentNotes.find((n) => n.id === id)
    if (n) {
      Object.assign(n, patch)
      n.updated_at = new Date().toISOString()
    }
    return n
  },
  async deletePinnedNote(id) {
    studentNotes = studentNotes.filter((n) => n.id !== id)
  },

  async listTeacherNotes() {
    return teacherNotes.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  async createTeacherNote({ school_year_id, category, body }) {
    const n = { id: uid(), school_year_id, category, body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    teacherNotes.push(n)
    return n
  },
  async updateTeacherNote(id, patch) {
    const n = teacherNotes.find((n) => n.id === id)
    if (n) {
      Object.assign(n, patch)
      n.updated_at = new Date().toISOString()
    }
    return n
  },
  async deleteTeacherNote(id) {
    teacherNotes = teacherNotes.filter((n) => n.id !== id)
  },
}
