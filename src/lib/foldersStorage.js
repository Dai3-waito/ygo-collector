const DEFAULT_FOLDERS = ['未分類']
const DEFAULT_FOLDER = '未分類'

export function foldersStorageKey(userId) {
  return userId ? `ygo-folders-${userId}` : 'ygo-folders-guest'
}

export function loadFolders(userId) {
  try {
    const raw = localStorage.getItem(foldersStorageKey(userId))
    if (!raw) return [...DEFAULT_FOLDERS]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_FOLDERS]
    const names = parsed.filter((n) => typeof n === 'string' && n.trim())
    return names.includes(DEFAULT_FOLDER) ? names : [DEFAULT_FOLDER, ...names]
  } catch {
    return [...DEFAULT_FOLDERS]
  }
}

export function saveFolders(userId, folders) {
  const unique = [...new Set(folders.map((f) => f.trim()).filter(Boolean))]
  if (!unique.includes(DEFAULT_FOLDER)) unique.unshift(DEFAULT_FOLDER)
  localStorage.setItem(foldersStorageKey(userId), JSON.stringify(unique))
  return unique
}

export function addFolderName(userId, name) {
  const trimmed = name.trim()
  if (!trimmed) return loadFolders(userId)
  const current = loadFolders(userId)
  if (current.includes(trimmed)) return current
  return saveFolders(userId, [...current, trimmed])
}

export { DEFAULT_FOLDER }
