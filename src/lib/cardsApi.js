import { cards as masterCards } from '../data/cards.js'
import { supabase } from './supabase.js'

export function rowToCard(row) {
  return {
    id: row.card_id,
    name: row.name ?? row.card_id,
    pack: row.pack ?? '',
    rarity: row.rarity ?? '',
    imageUrl: row.image_url || `/cards/${row.card_id}.jpg`,
    owned: row.owned ?? 0,
    location: row.location ?? '',
    collectionType: row.collection_type ?? '初版',
  }
}

export function cardToRow(card, userId) {
  return {
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
}

export async function fetchUserCards(userId) {
  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', userId)
    .order('card_id')

  if (error) throw error
  return (data ?? []).map(rowToCard)
}

export async function seedUserCards(userId) {
  const rows = masterCards.map((card) => cardToRow(card, userId))
  const { error } = await supabase.from('user_cards').insert(rows)
  if (error) throw error
  return rows.map((_, i) => masterCards[i])
}

export async function upsertUserCard(card, userId) {
  const { error } = await supabase.from('user_cards').upsert(cardToRow(card, userId), {
    onConflict: 'user_id,card_id',
  })
  if (error) throw error
}

export async function deleteUserCard(userId, cardId) {
  const { error } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId)
    .eq('card_id', cardId)
  if (error) throw error
}
