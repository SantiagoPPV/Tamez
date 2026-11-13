import { DataError, type Repository } from '../data/repository'
import type { StoredFile } from '../domain/types'

/**
 * Abre un archivo guardado en una pestaña nueva. La pestaña se abre en el momento del clic y
 * después navega a la liga firmada: Safari bloquea las pestañas que se abren tras una espera.
 */
export async function openStoredFile(repo: Repository, file: Pick<StoredFile, 'id' | 'path'> | null | undefined) {
  if (!file) return
  const tab = window.open('', '_blank')
  try {
    const url = await repo.fileUrl(file)
    if (!tab) throw new DataError('El navegador bloqueó la pestaña nueva: permite las ventanas emergentes de este sitio.')
    tab.opener = null
    tab.location.href = url
  } catch (e) {
    tab?.close()
    throw e
  }
}
