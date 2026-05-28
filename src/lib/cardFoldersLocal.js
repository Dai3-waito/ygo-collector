import { DEFAULT_FOLDER } from './foldersStorage.js'

function storageKey(userId) {
  return `ygo-card-folders-${userId}`
}

export function getCardFolderMap(userId) {
  if (!userId) return {}
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getCardFolder(userId, cardId) {
  const map = getCardFolderMap(userId)
  return map[cardId] || DEFAULT_FOLDER
}

export function setCardFolder(userId, cardId, folder) {
  if (!userId || !cardId) return
  const map = getCardFolderMap(userId)
  map[cardId] = folder?.trim() || DEFAULT_FOLDER
  localStorage.setItem(storageKey(userId), JSON.stringify(map))
}

export function isFolderColumnError(error) {
  const msg = String(error?.message ?? error ?? '')
  return msg.includes('folder') && msg.includes('schema cache')
}
