import { cards as masterCards } from '../data/cards.js'
import { setCodeFromCollectionId } from './collectionCardId.js'
import { getCardFolder, isFolderColumnError, setCardFolder } from './cardFoldersLocal.js'
import { DEFAULT_FOLDER } from './foldersStorage.js'
import { supabase } from './supabase.js'

export function rowToCard(row, userId) {
  const folderFromDb = row.folder?.trim()
  const folder =
    folderFromDb ||
    (userId ? getCardFolder(userId, row.card_id) : null) ||
    DEFAULT_FOLDER

  const passcode = row.passcode?.trim() || null

  return {
    id: row.card_id,
    setCode: setCodeFromCollectionId(row.card_id),
    name: row.name ?? row.card_id,
    pack: row.pack ?? '',
    rarity: row.rarity ?? '',
    imageUrl: row.image_url || '',
    passcode,
    owned: row.owned ?? 0,
    location: row.location ?? '',
    collectionType: row.collection_type ?? '',
    folder,
  }
}

export function cardToRow(card, userId, { includeFolder = true } = {}) {
  const row = {
    user_id: userId,
    card_id: card.id,
    name: card.name,
    pack: card.pack,
    rarity: card.rarity,
    image_url: card.imageUrl,
    passcode: card.passcode ?? null,
    owned: card.owned,
    location: card.location,
    collection_type: card.collectionType,
    updated_at: new Date().toISOString(),
  }
  if (includeFolder) {
    row.folder = card.folder?.trim() || DEFAULT_FOLDER
  }
  return row
}

export async function fetchUserCards(userId) {
  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', userId)
    .order('card_id')

  if (error) {
    if (/passcode/i.test(error.message ?? '')) {
      const { data: legacy, error: legacyError } = await supabase
        .from('user_cards')
        .select(
          'card_id, name, pack, rarity, image_url, owned, location, collection_type, folder, user_id, updated_at',
        )
        .eq('user_id', userId)
        .order('card_id')
      if (legacyError) throw legacyError
      return (legacy ?? []).map((row) => rowToCard(row, userId))
    }
    throw error
  }
  return (data ?? []).map((row) => rowToCard(row, userId))
}

export async function seedUserCards(userId) {
  const rows = masterCards.map((card) => cardToRow(card, userId))
  const { error } = await supabase.from('user_cards').insert(rows)
  if (error) throw error
  return rows.map((_, i) => masterCards[i])
}

export async function upsertUserCard(card, userId) {
  const folder = card.folder?.trim() || DEFAULT_FOLDER
  let row = cardToRow(card, userId)
  let folderLocalOnly = false

  let { error } = await supabase.from('user_cards').upsert(row, {
    onConflict: 'user_id,card_id',
  })

  if (error && isFolderColumnError(error)) {
    setCardFolder(userId, card.id, folder)
    folderLocalOnly = true
    row = cardToRow(card, userId, { includeFolder: false })
    ;({ error } = await supabase.from('user_cards').upsert(row, {
      onConflict: 'user_id,card_id',
    }))
  }

  if (error && /passcode/i.test(error.message ?? '')) {
    delete row.passcode
    ;({ error } = await supabase.from('user_cards').upsert(row, {
      onConflict: 'user_id,card_id',
    }))
  }

  if (error) throw error
  if (!folderLocalOnly) setCardFolder(userId, card.id, folder)
  return folderLocalOnly ? { folderLocalOnly: true } : {}
}

export async function deleteUserCard(userId, cardId) {
  const { error } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId)
    .eq('card_id', cardId)
  if (error) throw error
}
