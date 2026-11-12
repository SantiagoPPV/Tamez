import { useCallback, useEffect, useState } from 'react'
import { EMPTY_FIRM, type GlobalMap, type GlobalName } from '../data/repository'
import type { FirmSettings } from '../domain/types'
import { useRepo } from './session'

/** Una colección fuera de los proyectos (prospectos, propuestas, desgloses tipo, horas base). */
export function useGlobal<G extends GlobalName>(entity: G) {
  const repo = useRepo()
  const [rows, setRows] = useState<GlobalMap[G][] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => {
    try {
      setRows(await repo.listGlobal(entity))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setRows([])
    }
  }, [repo, entity])
  useEffect(() => {
    void reload()
  }, [reload])
  const save = useCallback(
    async (row: GlobalMap[G]) => {
      const saved = await repo.saveGlobal(entity, row)
      setRows((rs) => {
        const list = rs ?? []
        return list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved]
      })
      return saved
    },
    [repo, entity],
  )
  const remove = useCallback(
    async (id: string) => {
      await repo.removeGlobal(entity, id)
      setRows((rs) => (rs ?? []).filter((x) => x.id !== id))
    },
    [repo, entity],
  )
  return { rows, error, reload, save, remove }
}

/** Datos del despacho que llevan los documentos. */
export function useFirm() {
  const repo = useRepo()
  const [firm, setFirm] = useState<FirmSettings>(EMPTY_FIRM)
  useEffect(() => {
    let alive = true
    void repo
      .getFirm()
      .then((f) => alive && setFirm(f))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [repo])
  const save = useCallback(
    async (f: FirmSettings) => {
      await repo.saveFirm(f)
      setFirm(f)
    },
    [repo],
  )
  return { firm, save }
}
