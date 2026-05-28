import { getThemeByKey } from '../data/cardThemes.js'
import { normalizeForSearch } from './searchUtils.js'

const RACE_ROWS = [
  ['warrior', '戦士族', '战士', 'Warrior'],
  ['spellcaster', '魔法使い族', '魔法师', 'Spellcaster'],
  ['fairy', '天使族', '天使', 'Fairy'],
  ['fiend', '悪魔族', '恶魔', 'Fiend'],
  ['zombie', 'アンデット族', '不死', 'Zombie'],
  ['machine', '機械族', '机械', 'Machine'],
  ['aqua', '水族', '水族', 'Aqua'],
  ['pyro', '炎族', '炎', 'Pyro'],
  ['rock', '岩石族', '岩石', 'Rock'],
  ['winged_beast', '鳥獣族', '鸟兽', 'Winged Beast'],
  ['plant', '植物族', '植物', 'Plant'],
  ['insect', '昆虫族', '昆虫', 'Insect'],
  ['thunder', '雷族', '雷', 'Thunder'],
  ['dragon', 'ドラゴン族', '龙', 'Dragon'],
  ['beast', '獣族', '兽', 'Beast'],
  ['beast_warrior', '獣戦士族', '兽战士', 'Beast-Warrior'],
  ['dinosaur', '恐竜族', '恐龙', 'Dinosaur'],
  ['fish', '魚族', '鱼', 'Fish'],
  ['sea_serpent', '海竜族', '海龙', 'Sea Serpent'],
  ['reptile', '爬虫類族', '爬虫', 'Reptile'],
  ['psychic', 'サイキック族', '念动力', 'Psychic'],
  ['wyrm', '幻竜族', '幻龙', 'Wyrm'],
  ['cyberse', 'サイバース族', '电子界', 'Cyberse'],
  ['illusion', '幻想魔族', '幻想魔', 'Illusion'],
]

const ATTR_ROWS = [
  ['light', '光属性', '光', 'LIGHT'],
  ['dark', '闇属性', '暗', 'DARK'],
  ['fire', '炎属性', '炎', 'FIRE'],
  ['water', '水属性', '水', 'WATER'],
  ['earth', '地属性', '地', 'EARTH'],
  ['wind', '風属性', '风', 'WIND'],
  ['divine', '神属性', '神', 'DIVINE'],
]

function raceMatch(cnToken) {
  const t = cnToken.replace(/\//g, '')
  return (blob) => {
    const head = blob.split('\n')[0] ?? ''
    return new RegExp(`${t}\\/|${t}族|\\/${t}\\b`).test(head)
  }
}

function attrMatch(cnToken) {
  return (blob) => {
    const head = blob.split('\n')[0] ?? ''
    if (cnToken === '神') {
      return /\/神\b|神属性/.test(head)
    }
    return new RegExp(`\\/${cnToken}\\b|${cnToken}属性`).test(head)
  }
}

/** @type {Array<{ key: string, label: string, group: string, terms: string[], searchTerms: string[], prodeck?: object, match: (blob: string) => boolean }>} */
const INTENTS = [
  { key: 'monster', label: 'モンスター', group: 'main', terms: ['モンスター', '怪兽'], searchTerms: ['怪兽'], prodeck: null, match: (b) => /\[怪兽/.test(b) },
  { key: 'spell', label: '魔法', group: 'main', terms: ['魔法', 'spell'], searchTerms: ['魔法'], prodeck: { type: 'Spell Card' }, match: (b) => /\[魔法/.test(b) },
  { key: 'trap', label: '罠', group: 'main', terms: ['罠', 'トラップ', '陷阱'], searchTerms: ['陷阱'], prodeck: { type: 'Trap Card' }, match: (b) => /\[陷阱/.test(b) },

  { key: 'normal_monster', label: '通常モンスター', group: 'monster_subtype', terms: ['通常モンスター'], searchTerms: ['通常モンスター', '怪兽'], prodeck: { type: 'Normal Monster' }, match: (b) => { const h = b.split('\n')[0]; return /\[怪兽[^\]]*通常\]/.test(h) && !/效果|融合|同步|超量|连接|仪式|灵摆|ペンデュラム/.test(h) } },
  {
    key: 'effect_monster',
    label: '効果モンスター',
    group: 'monster_subtype',
    terms: ['効果モンスター'],
    searchTerms: ['効果モンスター', '怪兽'],
    prodeck: { type: 'Effect Monster' },
    match: (b) => {
      const h = b.split('\n')[0]
      return (
        /\[怪兽[^\]]*效果\]/.test(h) &&
        !/融合|同步|超量|连接|仪式/.test(h) &&
        !/\[怪兽[^\]]*通常\]/.test(h)
      )
    },
  },
  { key: 'fusion', label: '融合モンスター', group: 'monster_subtype', terms: ['融合', 'フュージョン'], searchTerms: ['融合'], prodeck: { type: 'Fusion Monster' }, match: (b) => /\[怪兽[^\]]*融合\]/.test(b) },
  { key: 'synchro', label: 'シンクロモンスター', group: 'monster_subtype', terms: ['シンクロ', 'synchro'], searchTerms: ['シンクロ', '同步'], prodeck: { type: 'Synchro Monster' }, match: (b) => /\[怪兽[^\]]*同步\]/.test(b) },
  { key: 'xyz', label: 'エクシーズモンスター', group: 'monster_subtype', terms: ['エクシーズ', 'xyz'], searchTerms: ['エクシーズ', '超量'], prodeck: { type: 'XYZ Monster' }, match: (b) => /\[怪兽[^\]]*超量\]/.test(b) },
  { key: 'link', label: 'リンクモンスター', group: 'monster_subtype', terms: ['リンク', 'link'], searchTerms: ['リンク', '连接'], prodeck: { type: 'Link Monster' }, match: (b) => /\[怪兽[^\]]*连接\]/.test(b) },
  { key: 'ritual_monster', label: '儀式モンスター', group: 'monster_subtype', terms: ['儀式モンスター', 'リチュアルモンスター'], searchTerms: ['儀式', '仪式'], prodeck: { type: 'Ritual Monster' }, match: (b) => /\[怪兽[^\]]*仪式\]/.test(b) },
  {
    key: 'pendulum',
    label: 'ペンデュラム',
    group: 'monster_subtype',
    terms: ['ペンデュラム', 'ペンデュラムモンスター', '霊摆'],
    searchTerms: ['ペンデュラム', '灵摆'],
    prodeck: null,
    match: (b) => {
      const h = b.split('\n')[0] ?? ''
      return /\[怪兽[^\]]*灵摆\]/.test(h) || /\[魔法[^\]]*灵摆\]/.test(h) || /\[陷阱[^\]]*灵摆\]/.test(h)
    },
  },
  { key: 'toon', label: 'トゥーンモンスター', group: 'monster_subtype', terms: ['トゥーン', '卡通'], searchTerms: ['トゥーン', '卡通'], prodeck: null, match: (b) => /\[怪兽[^\]]*卡通\]/.test(b) },
  { key: 'spirit', label: 'スピリットモンスター', group: 'monster_subtype', terms: ['スピリット', '灵魂'], searchTerms: ['スピリット', '灵魂'], prodeck: null, match: (b) => /\[怪兽[^\]]*灵魂\]/.test(b) },
  { key: 'flip', label: 'リバースモンスター', group: 'monster_subtype', terms: ['リバース', '反转'], searchTerms: ['リバース', '反转'], prodeck: null, match: (b) => /\[怪兽[^\]]*反转\]/.test(b) },
  { key: 'tuner', label: 'チューナー', group: 'monster_subtype', terms: ['チューナー', '调整'], searchTerms: ['チューナー', '调整'], prodeck: null, match: (b) => /\[怪兽[^\]]*调整\]/.test(b) },
  {
    key: 'dual',
    label: 'デュアル',
    group: 'monster_subtype',
    terms: ['デュアル', 'デュール', '二重'],
    searchTerms: ['二重', 'デュアル'],
    prodeck: null,
    match: (b) => {
      const head = b.split('\n')[0] ?? ''
      return /\[怪兽[^\]]*二重\]/.test(head) || /\[怪兽[^\]]*デュアル\]/.test(head)
    },
  },

  { key: 'normal_spell', label: '通常魔法', group: 'spell_subtype', terms: ['通常魔法'], searchTerms: ['魔法'], prodeck: null, match: (b) => /\[魔法[^\]]*通常\]/.test(b) || (/\[魔法\]/.test(b) && /通常/.test(b) && !/\[怪兽/.test(b)) },
  { key: 'quick_spell', label: '速攻魔法', group: 'spell_subtype', terms: ['速攻魔法'], searchTerms: ['速攻魔法', '魔法'], prodeck: null, match: (b) => /\[魔法[^\]]*速攻\]/.test(b) },
  { key: 'continuous_spell', label: '永続魔法', group: 'spell_subtype', terms: ['永続魔法'], searchTerms: ['永続魔法', '魔法'], prodeck: null, match: (b) => /\[魔法[^\]]*永续\]/.test(b) || /\[魔法[^\]]*永続\]/.test(b) },
  { key: 'equip_spell', label: '装備魔法', group: 'spell_subtype', terms: ['装備魔法'], searchTerms: ['装備魔法', '魔法'], prodeck: null, match: (b) => /\[魔法[^\]]*装备\]/.test(b) || /装備魔法/.test(b) },
  { key: 'field_spell', label: 'フィールド魔法', group: 'spell_subtype', terms: ['フィールド魔法', '场地魔法'], searchTerms: ['フィールド', '场地'], prodeck: null, match: (b) => /\[魔法[^\]]*场地\]/.test(b) || /フィールド魔法/.test(b) },
  { key: 'ritual_spell', label: '儀式魔法', group: 'spell_subtype', terms: ['儀式魔法'], searchTerms: ['儀式魔法', '仪式'], prodeck: null, match: (b) => /\[魔法[^\]]*仪式\]/.test(b) },

  { key: 'normal_trap', label: '通常罠', group: 'trap_subtype', terms: ['通常罠'], searchTerms: ['通常罠', '陷阱'], prodeck: null, match: (b) => /\[陷阱[^\]]*通常\]/.test(b) || (/\[陷阱\]/.test(b) && /通常/.test(b.split('\n')[0])) },
  { key: 'continuous_trap', label: '永続罠', group: 'trap_subtype', terms: ['永続罠'], searchTerms: ['永続罠', '陷阱'], prodeck: null, match: (b) => /\[陷阱[^\]]*永续\]/.test(b) || /\[陷阱[^\]]*永続\]/.test(b) },
  { key: 'counter_trap', label: 'カウンター罠', group: 'trap_subtype', terms: ['カウンター罠', 'カウンタ罠'], searchTerms: ['カウンター', '陷阱'], prodeck: null, match: (b) => /\[陷阱[^\]]*カウンター\]/.test(b) || /カウンター罠/.test(b) },
]

for (const [key, label, cn, prodeckRace] of RACE_ROWS) {
  INTENTS.push({
    key,
    label,
    group: 'race',
    terms: [label, label.replace('族', '')],
    searchTerms: [label, cn],
    prodeck: { race: prodeckRace },
    match: raceMatch(cn),
  })
}

for (const [key, label, cn, prodeckAttr] of ATTR_ROWS) {
  INTENTS.push({
    key,
    label,
    group: 'attribute',
    terms: [label, cn + '属性'],
    searchTerms: [label, cn],
    prodeck: { attribute: prodeckAttr },
    match: attrMatch(cn),
  })
}

const INTENT_BY_KEY = new Map(INTENTS.map((i) => [i.key, i]))

const GROUP_META = [
  { id: 'main', label: '大分類', section: 'card', ui: 'chips' },
  { id: 'monster_subtype', label: 'モンスター詳細', section: 'card', ui: 'chips' },
  { id: 'spell_subtype', label: '魔法詳細', section: 'card', ui: 'chips' },
  { id: 'trap_subtype', label: '罠詳細', section: 'card', ui: 'chips' },
  { id: 'race', label: '種族', section: 'card', ui: 'chips' },
  { id: 'attribute', label: '属性', section: 'card', ui: 'chips' },
]

/** 詳細検索パネル用（グループ別） */
export const CATEGORY_FILTER_GROUPS = GROUP_META.map((g) => ({
  ...g,
  options: INTENTS.filter((i) => i.group === g.id).map((i) => ({
    key: i.key,
    label: i.label,
  })),
}))

/** 大分類・サブタイプに応じて表示する分類グループ */
export function visibleFilterGroups(filters = EMPTY_CATEGORY_FILTERS) {
  const main = filters?.mainType ?? ''
  const sub = getIntentByKey(filters?.subtype)

  return CATEGORY_FILTER_GROUPS.filter((g) => {
    if (g.id === 'main' || g.id === 'race' || g.id === 'attribute') return true
    if (g.id === 'monster_subtype') {
      return !main || main === 'monster' || sub?.group === 'monster_subtype'
    }
    if (g.id === 'spell_subtype') {
      return main === 'spell' || sub?.group === 'spell_subtype'
    }
    if (g.id === 'trap_subtype') {
      return main === 'trap' || sub?.group === 'trap_subtype'
    }
    return true
  })
}

export const EMPTY_CATEGORY_FILTERS = {
  mainType: '',
  subtype: '',
  race: '',
  attribute: '',
  theme: '',
}

export function getIntentByKey(key) {
  return INTENT_BY_KEY.get(key) ?? null
}

export function hasActiveCategoryFilters(filters) {
  if (String(filters?.theme ?? '').trim()) return true
  return createFilterMatcher(filters) != null
}

const SUBTYPE_IMPLIES_MAIN = {
  monster_subtype: 'monster',
  spell_subtype: 'spell',
  trap_subtype: 'trap',
}

/** @param {typeof EMPTY_CATEGORY_FILTERS} filters */
export function createFilterMatcher(filters) {
  const parts = []
  if (filters?.mainType) parts.push(getIntentByKey(filters.mainType))
  if (filters?.subtype) parts.push(getIntentByKey(filters.subtype))
  if (filters?.race) parts.push(getIntentByKey(filters.race))
  if (filters?.attribute) parts.push(getIntentByKey(filters.attribute))

  let active = parts.filter(Boolean)
  if (active.length === 0) return null

  if ((filters?.race || filters?.attribute) && !filters?.mainType && !filters?.subtype) {
    const monster = getIntentByKey('monster')
    if (monster) active = [monster, ...active]
  }

  const sub = active.find((i) => SUBTYPE_IMPLIES_MAIN[i.group])
  const main = active.find((i) => i.group === 'main')
  if (sub && main && SUBTYPE_IMPLIES_MAIN[sub.group] === main.key) {
    active = active.filter((i) => i !== main)
  }

  return {
    intents: active,
    match(typesLine) {
      const blob = typesBlob(typesLine)
      if (!blob) return false
      return active.every((intent) => intent.match(blob))
    },
    searchTerms() {
      const terms = new Set()
      for (const intent of active) {
        for (const t of intent.searchTerms) terms.add(t)
      }
      return [...terms].filter((t) => t.length >= 2)
    },
    prodeckParams() {
      const p = {}
      for (const intent of active) {
        if (intent.prodeck?.type) p.type = intent.prodeck.type
        if (intent.prodeck?.race) p.race = intent.prodeck.race
        if (intent.prodeck?.attribute) p.attribute = intent.prodeck.attribute
      }
      return Object.keys(p).length > 0 ? p : null
    },
  }
}

export function filterCatalogByMatcher(list, matcher) {
  if (!matcher) return list
  return list.filter((item) => {
    const blob = catalogTypesBlob(item)
    return blob ? matcher.match(blob) : false
  })
}

const SUBTYPE_GROUP_FOR_MAIN = {
  monster: 'monster_subtype',
  spell: 'spell_subtype',
  trap: 'trap_subtype',
}

/** 矛盾する種類・サブタイプの組み合わせを解消 */
export function sanitizeCategoryFilters(filters) {
  const f = { ...EMPTY_CATEGORY_FILTERS, ...filters }
  const main = getIntentByKey(f.mainType)
  let sub = getIntentByKey(f.subtype)

  if (main && sub) {
    const expectedGroup = SUBTYPE_GROUP_FOR_MAIN[main.key]
    if (expectedGroup && sub.group !== expectedGroup) {
      f.subtype = ''
      sub = null
    }
  }

  if (f.subtype) {
    sub = getIntentByKey(f.subtype)
    if (sub?.group === 'monster_subtype' && f.mainType && f.mainType !== 'monster') {
      f.mainType = 'monster'
    } else if (sub?.group === 'spell_subtype') {
      f.mainType = 'spell'
    } else if (sub?.group === 'trap_subtype') {
      f.mainType = 'trap'
    }
  }

  return f
}

function prodeckTypeToCnBracket(type) {
  const t = String(type ?? '').toLowerCase()
  if (t.includes('spell')) return '魔法'
  if (t.includes('trap')) return '陷阱'
  if (t.includes('fusion')) return '怪兽|融合'
  if (t.includes('synchro')) return '怪兽|同步'
  if (t.includes('xyz')) return '怪兽|超量'
  if (t.includes('link')) return '怪兽|连接'
  if (t.includes('ritual')) return '怪兽|仪式'
  if (t.includes('effect')) return '怪兽|效果'
  if (t.includes('normal')) return '怪兽|通常'
  return '怪兽'
}

const PRODECK_RACE_CN = Object.fromEntries(RACE_ROWS.map(([, , cn, en]) => [en, cn]))
const PRODECK_ATTR_CN = Object.fromEntries(ATTR_ROWS.map(([, , cn, prodeckAttr]) => [prodeckAttr, cn]))

function prodeckRaceAttrLine(item) {
  const race = String(item.cardRace ?? '')
  const attr = String(item.cardAttribute ?? item.attribute ?? '')
  const raceCn = PRODECK_RACE_CN[race] ?? race
  const attrCn = PRODECK_ATTR_CN[attr] ?? attr
  if (raceCn && attrCn) return `${raceCn}/${attrCn}`
  return raceCn || ''
}

function catalogTypesBlob(item) {
  if (item?.typesLine) return typesBlob(item.typesLine)
  if (item?.cardType || item?.cardRace || item?.cardAttribute) {
    return `[${prodeckTypeToCnBracket(item.cardType)}] ${prodeckRaceAttrLine(item)}`
  }
  return ''
}

function typesBlob(typesLine) {
  return String(typesLine ?? '').trim()
}

/** @returns {typeof INTENTS[number] | null} */
export function resolveCategoryIntent(query) {
  const raw = String(query ?? '').trim()
  if (raw.length < 2) return null
  const norm = normalizeForSearch(raw)

  let best = null
  let bestLen = 0
  for (const intent of INTENTS) {
    for (const term of intent.terms) {
      const tNorm = normalizeForSearch(term)
      if (raw.includes(term) || norm.includes(tNorm)) {
        if (term.length > bestLen) {
          best = intent
          bestLen = term.length
        }
      }
    }
  }
  return best
}

export function isCategoryQuery(query) {
  return resolveCategoryIntent(query) != null
}

export function cardTypesMatchIntent(typesLine, intent) {
  if (!intent) return true
  const blob = typesBlob(typesLine)
  if (!blob) return false
  return intent.match(blob)
}

const CN_PART_MAP = {
  怪兽: 'モンスター',
  魔法: '魔法',
  陷阱: '罠',
  通常: '通常',
  效果: '効果',
  融合: '融合',
  同步: 'シンクロ',
  超量: 'エクシーズ',
  连接: 'リンク',
  仪式: '儀式',
  永续: '永続',
  速攻: '速攻',
  装备: '装備',
  场地: 'フィールド',
  灵摆: 'ペンデュラム',
  卡通: 'トゥーン',
  灵魂: 'スピリット',
  反转: 'リバース',
  调整: 'チューナー',
  二重: 'デュアル',
  カウンター: 'カウンター',
}

const CN_RACE_TO_LABEL = Object.fromEntries(RACE_ROWS.map(([, label, cn]) => [cn, label]))
const CN_ATTR_TO_LABEL = Object.fromEntries(
  ATTR_ROWS.map(([, label, cn]) => [cn, label.replace(/属性$/, '')]),
)

function formatRaceAttribute(raceCn, attrCn) {
  const race = CN_RACE_TO_LABEL[raceCn] ?? (raceCn.endsWith('族') ? raceCn : `${raceCn}族`)
  const att = CN_ATTR_TO_LABEL[attrCn] ?? attrCn
  return `${race}・${att}`
}

export function formatCardCategory(typesLine) {
  const head = typesBlob(typesLine).split('\n')[0] ?? ''
  if (!head) return ''

  const bracket = head.match(/\[([^\]]+)\]/)
  if (!bracket) return head.slice(0, 48)

  const parts = bracket[1].split('|').map((p) => CN_PART_MAP[p.trim()] ?? p.trim())
  const typeLabel = parts.join('・')

  const monsterLine = head.match(/\]\s*([^[\n/]+)\/([^/\n\s]+)/)
  if (monsterLine) {
    return `${typeLabel} / ${formatRaceAttribute(monsterLine[1].trim(), monsterLine[2].trim())}`
  }

  return typeLabel
}

/** 検索結果などに表示する分類ラベル（テーマ名があれば併記） */
export function formatCardCategoryLabel(card, themeKey = '') {
  const typePart = card?.category || formatCardCategory(card?.typesLine ?? '')
  const theme = themeKey ? getThemeByKey(themeKey) : null
  if (theme?.label && typePart) return `${theme.label} / ${typePart}`
  if (theme?.label) return theme.label
  return typePart
}

export function categoryMatchScore(typesLine, query) {
  const intent = resolveCategoryIntent(query)
  if (!intent) return 0
  return cardTypesMatchIntent(typesLine, intent) ? 450 : -250
}

export function categorySearchTerms(query) {
  const intent = resolveCategoryIntent(query)
  if (!intent) return [String(query ?? '').trim()]
  return [...new Set([...intent.searchTerms, String(query ?? '').trim()].filter((t) => t.length >= 2))]
}

export function prodeckParamsFromIntent(intent) {
  return intent?.prodeck ?? null
}

/** 選択中フィルタの表示ラベル（テーマとカード分類を区別） */
export function describeCategoryFilters(filters) {
  const labels = []
  if (filters?.theme) labels.push(`テーマ:${getThemeByKey(filters.theme)?.label}`)
  const cardLabels = []
  if (filters?.mainType) cardLabels.push(getIntentByKey(filters.mainType)?.label)
  if (filters?.subtype) cardLabels.push(getIntentByKey(filters.subtype)?.label)
  if (filters?.race) cardLabels.push(getIntentByKey(filters.race)?.label)
  if (filters?.attribute) cardLabels.push(getIntentByKey(filters.attribute)?.label)
  if (cardLabels.length) labels.push(`分類:${cardLabels.filter(Boolean).join('・')}`)
  return labels
}
