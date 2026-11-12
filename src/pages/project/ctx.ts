import { useCallback, useState } from 'react'
import { useOutletContext } from 'react-router'
import type { ProjectApi } from '../../app/useProject'
import { HOUR_CLASS } from '../../domain/catalogs'
import type { ProjectData } from '../../domain/types'

export const useP = () => useOutletContext<ProjectApi>()

export function names(d: ProjectData) {
  const members = new Map(d.members.map((m) => [m.id, m.name]))
  const contacts = new Map(d.contacts.map((c) => [c.id, c.name]))
  const segments = new Map(d.segments.map((s) => [s.id, s.name]))
  return {
    member: (id: string | null | undefined) => (id ? (members.get(id) ?? '') : ''),
    contact: (id: string | null | undefined) => (id ? (contacts.get(id) ?? '') : ''),
    segment: (id: string | null | undefined) => (id ? (segments.get(id) ?? '') : ''),
    memberOptions: d.members.map((m) => ({ value: m.id, label: m.name })),
    contactOptions: d.contacts.map((c) => ({ value: c.id, label: c.role ? `${c.name} · ${c.role}` : c.name })),
    segmentOptions: [...d.segments].sort((a, b) => a.position - b.position).map((s) => ({ value: s.id, label: s.name })),
  }
}

export const hourClassLabel = (c: keyof typeof HOUR_CLASS | null) => (c ? HOUR_CLASS[c] : '')

/** Guardar con aviso de error y estado ocupado. */
export function useSaver() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy(false)
    }
  }, [])
  return { busy, error, setError, run }
}

/** Una copia editable del renglón mientras el panel está abierto. */
export function useDraft<T>() {
  const [draft, setDraft] = useState<T | null>(null)
  const set = useCallback(<K extends keyof T>(k: K, v: T[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d)), [])
  return { draft, setDraft, set }
}
