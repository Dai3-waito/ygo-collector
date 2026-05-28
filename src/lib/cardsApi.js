import { cards as masterCards } from '../data/cards.js'
import { getCardFolder, isFolderColumnError, setCardFolder } from './cardFoldersLocal.js'
import { DEFAULT_FOLDER } from './foldersStorage.js'
import { supabase } from './supabase.js'

export function rowToCard(row, userId) {
  const folderFromDb = row.folder?.trim()
  const folder =
    folderFromDb ||
    (userId ? getCardFolder(userId, row.card_id) : null) ||
    DEFAULT_FOLDER

  return {
    id: row.card_id,
    name: row.name ?? row.card_id,
    pack: row.pack ?? '',
    rarity: row.rarity ?? '',
    imageUrl: row.image_url || `/cards/${row.card_id}.jpg`,
    owned: row.owned ?? 0,
    location: row.location ?? '',
    collectionType: row.collection_type ?? '初版',
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

  if (error) throw error
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
  let { error } = await supabase.from('user_cards').upsert(cardToRow(card, userId), {
    onConflict: 'user_id,card_id',
  })

  if (error && isFolderColumnError(error)) {
    setCardFolder(userId, card.id, folder)
    ;({ error } = await supabase.from('user_cards').upsert(cardToRow(card, userId, { includeFolder: false }), {
      onConflict: 'user_id,card_id',
    }))
    if (error) throw error
    return { folderLocalOnly: true }
  }

  if (error) throw error
  setCardFolder(userId, card.id, folder)
  return {}
}

export async function deleteUserCard(userId, cardId) {
  const { error } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId)
    .eq('card_id', cardId)
  if (error) throw error
}
