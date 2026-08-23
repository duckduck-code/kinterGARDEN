import { supabase } from './supabase'
import { isPreviewMode, mock } from './mockData'

// Thin wrappers around supabase-js. Every screen calls these directly and
// manages its own loading/error state — there's exactly one small class of
// data here, not enough surface area to justify a client-side cache layer.
//
// Each function starts by checking isPreviewMode() and, if so, delegates to
// the in-memory mock instead of hitting Supabase — see lib/mockData.js.
// That flag can only ever be true in `npm run dev`, never in a built app.

// ---------------------------------------------------------------------------
// School years
// ---------------------------------------------------------------------------

export async function getCurrentSchoolYear() {
  if (isPreviewMode()) return mock.getCurrentSchoolYear()
  const { data, error } = await supabase.from('school_years').select('*').eq('is_current', true).maybeSingle()
  if (error) throw error
  return data
}

export async function listSchoolYears() {
  if (isPreviewMode()) return mock.listSchoolYears()
  const { data, error } = await supabase.from('school_years').select('*').order('start_date', { ascending: false })
  if (error) throw error
  return data
}

// Admin-only (RLS: school_years update/delete require role = 'admin') — the
// September rollover is deliberately not something the teacher account can do.
export async function createSchoolYear({ label, start_date, end_date }) {
  if (isPreviewMode()) return mock.createSchoolYear({ label, start_date, end_date })
  const { data, error } = await supabase.from('school_years').insert({ label, start_date, end_date, is_current: false }).select().single()
  if (error) throw error
  return data
}

export async function setCurrentSchoolYear(id) {
  if (isPreviewMode()) return mock.setCurrentSchoolYear(id)
  const all = await listSchoolYears()
  await Promise.all(
    all.filter((y) => y.is_current && y.id !== id).map((y) => supabase.from('school_years').update({ is_current: false }).eq('id', y.id))
  )
  const { data, error } = await supabase.from('school_years').update({ is_current: true }).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function listStudents(schoolYearId, { includeArchived = false } = {}) {
  if (isPreviewMode()) return mock.listStudents(schoolYearId, { includeArchived })
  let query = supabase.from('students').select('*').eq('school_year_id', schoolYearId).order('sort_order', { ascending: true })
  if (!includeArchived) query = query.eq('status', 'active')
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getStudent(id) {
  if (isPreviewMode()) return mock.getStudent(id)
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createStudent(student) {
  if (isPreviewMode()) return mock.createStudent(student)
  const { data, error } = await supabase.from('students').insert(student).select().single()
  if (error) throw error
  return data
}

export async function updateStudent(id, patch) {
  if (isPreviewMode()) return mock.updateStudent(id, patch)
  const { data, error } = await supabase.from('students').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function archiveStudent(id) {
  return updateStudent(id, { status: 'archived' })
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

export async function listDomains({ includeHidden = true } = {}) {
  if (isPreviewMode()) return mock.listDomains({ includeHidden })
  let query = supabase.from('domains').select('*').order('sort_order', { ascending: true })
  if (!includeHidden) query = query.eq('is_hidden', false)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createDomain(domain) {
  if (isPreviewMode()) return mock.createDomain(domain)
  const { data, error } = await supabase.from('domains').insert(domain).select().single()
  if (error) throw error
  return data
}

export async function updateDomain(id, patch) {
  if (isPreviewMode()) return mock.updateDomain(id, patch)
  const { data, error } = await supabase.from('domains').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDomain(id) {
  if (isPreviewMode()) return mock.deleteDomain(id)
  const { error } = await supabase.from('domains').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Units (per domain — "Unit 2 · Lesson 5")
// ---------------------------------------------------------------------------

export async function listUnits() {
  if (isPreviewMode()) return mock.listUnits()
  const { data, error } = await supabase.from('units').select('*').order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createUnit(unit) {
  if (isPreviewMode()) return mock.createUnit(unit)
  const { data, error } = await supabase.from('units').insert(unit).select().single()
  if (error) throw error
  return data
}

export async function updateUnit(id, patch) {
  if (isPreviewMode()) return mock.updateUnit(id, patch)
  const { data, error } = await supabase.from('units').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteUnit(id) {
  if (isPreviewMode()) return mock.deleteUnit(id)
  const { error } = await supabase.from('units').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

const OBSERVATION_SELECT = '*, observation_domains(domain_id)'

export async function listObservationsForStudent(studentId) {
  if (isPreviewMode()) return mock.listObservationsForStudent(studentId)
  const { data, error } = await supabase
    .from('observations')
    .select(OBSERVATION_SELECT)
    .eq('student_id', studentId)
    .order('observed_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(normalizeObservation)
}

export async function listObservationsForSchoolYear(schoolYearId) {
  if (isPreviewMode()) return mock.listObservationsForSchoolYear(schoolYearId)
  const { data, error } = await supabase
    .from('observations')
    .select(OBSERVATION_SELECT)
    .eq('school_year_id', schoolYearId)
    .order('observed_on', { ascending: false })
  if (error) throw error
  return data.map(normalizeObservation)
}

export async function listFlaggedObservations(schoolYearId) {
  if (isPreviewMode()) return mock.listFlaggedObservations(schoolYearId)
  const { data, error } = await supabase
    .from('observations')
    .select(`${OBSERVATION_SELECT}, students(first_name, last_initial)`)
    .eq('school_year_id', schoolYearId)
    .eq('is_flagged', true)
    .order('observed_on', { ascending: false })
  if (error) throw error
  return data.map(normalizeObservation)
}

export async function searchObservations(schoolYearId, term) {
  if (isPreviewMode()) return mock.searchObservations(schoolYearId, term)
  const { data, error } = await supabase
    .from('observations')
    .select(`${OBSERVATION_SELECT}, students(first_name, last_initial)`)
    .eq('school_year_id', schoolYearId)
    .ilike('body', `%${term}%`)
    .order('observed_on', { ascending: false })
  if (error) throw error
  return data.map(normalizeObservation)
}

function normalizeObservation(row) {
  return {
    ...row,
    domainIds: (row.observation_domains ?? []).map((d) => d.domain_id),
  }
}

export async function createObservation({ domainIds = [], ...observation }) {
  if (isPreviewMode()) return mock.createObservation({ domainIds, ...observation })
  const { data, error } = await supabase.from('observations').insert(observation).select().single()
  if (error) throw error
  if (domainIds.length) {
    await setObservationDomains(data.id, domainIds)
  }
  return { ...data, domainIds }
}

export async function updateObservation(id, { domainIds, ...patch }) {
  if (isPreviewMode()) return mock.updateObservation(id, { domainIds, ...patch })
  const { data, error } = await supabase.from('observations').update(patch).eq('id', id).select().single()
  if (error) throw error
  if (domainIds) {
    await setObservationDomains(id, domainIds)
  }
  return { ...data, domainIds: domainIds ?? [] }
}

async function setObservationDomains(observationId, domainIds) {
  await supabase.from('observation_domains').delete().eq('observation_id', observationId)
  if (domainIds.length) {
    const rows = domainIds.map((domain_id) => ({ observation_id: observationId, domain_id }))
    const { error } = await supabase.from('observation_domains').insert(rows)
    if (error) throw error
  }
}

export async function deleteObservation(id) {
  if (isPreviewMode()) return mock.deleteObservation(id)
  const { error } = await supabase.from('observations').delete().eq('id', id)
  if (error) throw error
}

export async function toggleObservationFlag(id, isFlagged) {
  return updateObservation(id, { is_flagged: isFlagged })
}

// "Quiet list" — students with the fewest notes in the last N days (R3.5.1).
export async function getObservationCountsSince(schoolYearId, sinceISODate) {
  if (isPreviewMode()) return mock.getObservationCountsSince(schoolYearId, sinceISODate)
  const { data, error } = await supabase
    .from('observations')
    .select('student_id')
    .eq('school_year_id', schoolYearId)
    .gte('observed_on', sinceISODate)
  if (error) throw error
  const counts = {}
  for (const row of data) {
    counts[row.student_id] = (counts[row.student_id] ?? 0) + 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// Summaries (per-term narrative)
// ---------------------------------------------------------------------------

export async function listSummariesForStudent(studentId) {
  if (isPreviewMode()) return mock.listSummariesForStudent(studentId)
  const { data, error } = await supabase.from('summaries').select('*').eq('student_id', studentId)
  if (error) throw error
  return data
}

export async function upsertSummary({ student_id, school_year_id, term, body }) {
  if (isPreviewMode()) return mock.upsertSummary({ student_id, school_year_id, term, body })
  const { data, error } = await supabase
    .from('summaries')
    .upsert({ student_id, school_year_id, term, body }, { onConflict: 'student_id,term' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Pinned notes (allergies, plans, special needs, description) — R3.4.4.
// Always private: never appears in any printed or shared report.
// ---------------------------------------------------------------------------

export async function listPinnedNotes(studentId) {
  if (isPreviewMode()) return mock.listPinnedNotes(studentId)
  const { data, error } = await supabase
    .from('student_notes')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createPinnedNote({ student_id, category, body }) {
  if (isPreviewMode()) return mock.createPinnedNote({ student_id, category, body })
  const { data, error } = await supabase.from('student_notes').insert({ student_id, category, body }).select().single()
  if (error) throw error
  return data
}

export async function updatePinnedNote(id, patch) {
  if (isPreviewMode()) return mock.updatePinnedNote(id, patch)
  const { data, error } = await supabase.from('student_notes').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePinnedNote(id) {
  if (isPreviewMode()) return mock.deletePinnedNote(id)
  const { error } = await supabase.from('student_notes').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Teacher notes — personal reflections, not tied to any student, never
// printed. Ideas, what went well, what to change, routine tweaks.
// ---------------------------------------------------------------------------

export async function listTeacherNotes(schoolYearId) {
  if (isPreviewMode()) return mock.listTeacherNotes(schoolYearId)
  const { data, error } = await supabase
    .from('teacher_notes')
    .select('*')
    .eq('school_year_id', schoolYearId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTeacherNote({ school_year_id, category, body }) {
  if (isPreviewMode()) return mock.createTeacherNote({ school_year_id, category, body })
  const { data, error } = await supabase.from('teacher_notes').insert({ school_year_id, category, body }).select().single()
  if (error) throw error
  return data
}

export async function updateTeacherNote(id, patch) {
  if (isPreviewMode()) return mock.updateTeacherNote(id, patch)
  const { data, error } = await supabase.from('teacher_notes').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTeacherNote(id) {
  if (isPreviewMode()) return mock.deleteTeacherNote(id)
  const { error } = await supabase.from('teacher_notes').delete().eq('id', id)
  if (error) throw error
}
