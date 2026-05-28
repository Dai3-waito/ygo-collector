import { neuronPackPageUrl } from '../lib/neuronParse.js'

/**
 * カードの pack 表記ゆれの照合・ニューロン収録 pid
 */
export const packCatalog = {
  'Blazing Dominion': {
    deckSetName: 'Blazing Dominion',
    neuronKeyword: 'ブレイジング・ドミニオン',
    neuronPid: '1000009559000',
  },
  'LEGACY OF DESTRUCTION': {
    deckSetName: 'Legacy of Destruction',
    neuronKeyword: 'レガシー・オブ・デストラクション',
    neuronPid: '1000009003000',
  },
  'マキシマム・クライシス': {
    deckSetName: 'Maximum Crisis',
    neuronKeyword: 'マキシマム・クライシス',
    neuronPid: '1119003',
  },
  'DARK NEOSTORM': {
    deckSetName: 'Dark Neostorm',
    neuronKeyword: 'ダーク・ネオストーム',
    neuronPid: '1121003',
  },
  'QUARTER CENTURY CHRONICLE side:UNITY': {
    deckSetName: 'Quarter Century Chronicle side:Unity',
    neuronKeyword: 'QUARTER CENTURY CHRONICLE side',
    neuronPid: '1000007506000',
  },
  'QUARTER CENTURY DUELIST BOX': {
    deckSetName: 'Quarter Century Duelist Box',
    neuronKeyword: 'QUARTER CENTURY DUELIST BOX',
  },
  'RARITY COLLECTION -QUARTER CENTURY EDITION-': {
    deckSetName: 'Rarity Collection Quarter Century Edition',
    neuronKeyword: 'RARITY COLLECTION',
    neuronPid: '1000007505000',
  },
  'デュエリストパック－レジェンドデュエリスト編6－': {
    deckSetName: 'Duelist Pack: Legend Duelist 6',
    neuronKeyword: 'レジェンドデュエリスト編',
  },
  'WORLD PREMIERE PACK 2023': {
    deckSetName: 'World Premiere Pack 2023',
    neuronKeyword: 'WORLD PREMIERE PACK 2023',
  },
  'Phantom Nightmare': {
    deckSetName: 'Phantom Nightmare',
    neuronKeyword: 'ファントム・ナイトメア',
    neuronPid: '1000009002000',
  },

}

/** @deprecated 収録 link_value を優先。無いときのみ pid から収録ページを組み立て */
export function getNeuronPackUrl(packName, pid) {
  if (pid) return neuronPackPageUrl(pid)
  return 'https://www.db.yugioh-card.com/yugiohdb/card_list.action?wname=CardSearch&clm=1&request_locale=ja'
}
