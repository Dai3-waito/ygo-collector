/**
 * OCG テーマ（シリーズ）
 * - searchQuery / extraQueries: 百鸽（日本語名・OCG型番）
 * - prodeckArchetype / altArchetypes: YGOPRODeck（英語アーキタイプ名）
 * - anchorPasscodes: テーマの要カードを検索結果上位に
 */
export const CARD_THEME_OPTIONS = [
  { key: 'aigis', label: 'Ａ・i・ジ', searchQuery: 'Ａ・i・ジ', prodeckArchetype: 'A.I.' },
  { key: 'ignister', label: '＠イグニスター', searchQuery: '＠イグニスター', prodeckArchetype: '@Ignister' },
  { key: 'amazoness', label: 'アマゾネス', searchQuery: 'アマゾネス', prodeckArchetype: 'Amazoness' },
  { key: 'adamancipator', label: 'アダマンティペーター', searchQuery: 'アダマンティ', prodeckArchetype: 'Adamancipator' },
  { key: 'ancient_gear', label: 'アンティーク・ギア', searchQuery: 'アンティーク・ギア', prodeckArchetype: 'Ancient Gear' },
  {
    key: 'albaz',
    label: 'アルバゾ',
    searchQuery: 'アルバゾ',
    extraQueries: ['落胤', '烙印'],
    altArchetypes: ['Branded', 'Despia', 'Fallen of Albaz'],
    anchorPasscodes: ['68468459'],
    prodeckArchetype: 'Branded',
  },
  { key: 'artifact', label: 'アーティファクト', searchQuery: 'アーティファクト', prodeckArchetype: 'Artifact' },
  { key: 'utopia', label: 'Ｎｏ', searchQuery: 'ナンバーズ', prodeckArchetype: 'Number' },
  { key: 'odd_eyes', label: 'オッドアイズ', searchQuery: 'オッドアイズ', prodeckArchetype: 'Odd-Eyes' },
  { key: 'orcust', label: 'オルフェゴール', searchQuery: 'オルフェゴール', prodeckArchetype: 'Orcust' },
  { key: 'gold_pride', label: 'ゴールド Pride', searchQuery: 'ゴールド Pride', prodeckArchetype: 'Gold Pride' },
  { key: 'ghostrick', label: 'ゴーストリック', searchQuery: 'ゴーストリック', prodeckArchetype: 'Ghostrick' },
  { key: 'gouki', label: '剛鬼', searchQuery: '剛鬼', prodeckArchetype: 'Gouki' },
  { key: 'kagero', label: '影六武衆', searchQuery: '影六武衆', prodeckArchetype: 'Six Samurai' },
  { key: 'gem_knight', label: 'ジェムナイト', searchQuery: 'ジェムナイト', prodeckArchetype: 'Gem-Knight' },
  {
    key: 'shaddoll',
    label: 'シャドール',
    searchQuery: 'シャドール',
    extraQueries: ['エルシャドール', 'ネフィシャドール'],
    altArchetypes: ['El Shaddoll'],
    prodeckArchetype: 'Shaddoll',
  },
  { key: 'six_samurai', label: '六武衆', searchQuery: '六武衆', prodeckArchetype: 'Six Samurai' },
  { key: 'sky_striker', label: '閃刀姫', searchQuery: '閃刀', prodeckArchetype: 'Sky Striker' },
  { key: 'centurion', label: 'センチュリオン', searchQuery: 'センチュリオン', prodeckArchetype: 'Centur-Ion' },
  { key: 'salamangreat', label: 'サラマングレイト', searchQuery: 'サラマングレイト', prodeckArchetype: 'Salamangreat' },
  { key: 'solfachord', label: 'ソリファード', searchQuery: 'ソリファード', prodeckArchetype: 'Solfachord' },
  { key: 'dinomorphia', label: 'ダイノルフィア', searchQuery: 'ダイノルフィア', prodeckArchetype: 'Dinomorphia' },
  { key: 'tearlaments', label: 'ティアラメンツ', searchQuery: 'ティアラメンツ', prodeckArchetype: 'Tearlaments' },
  { key: 'trickstar', label: 'トリックスター', searchQuery: 'トリックスター', prodeckArchetype: 'Trickstar' },
  { key: 'tri_brigade', label: '鉄獣戦線', searchQuery: '鉄獣', prodeckArchetype: 'Tri-Brigade' },
  { key: 'dragonmaid', label: 'ドラゴメイド', searchQuery: 'ドラゴメイド', prodeckArchetype: 'Dragonmaid' },
  {
    key: 'hero',
    label: 'Ｅ・ＨＥＲＯ',
    searchQuery: 'Ｅ・ＨＥＲＯ',
    extraQueries: ['エレメンタル', 'ヒーロー'],
    altArchetypes: ['Elemental HERO', 'Destiny HERO', 'HERO'],
    anchorPasscodes: ['58932153'],
    prodeckArchetype: 'HERO',
  },
  { key: 'predaplant', label: '捕食植物', searchQuery: '捕食植物', prodeckArchetype: 'Predaplant' },
  { key: 'prank_kids', label: 'プランキッズ', searchQuery: 'プランキッズ', prodeckArchetype: 'Prank-Kids' },
  { key: 'purrely', label: 'ピュアリィ', searchQuery: 'ピュアリィ', prodeckArchetype: 'Purrely' },
  { key: 'floowandereeze', label: 'ふわんだりぃず', searchQuery: 'ふわん', prodeckArchetype: 'Floowandereeze' },
  { key: 'magistus', label: 'マギストス', searchQuery: 'マギストス', prodeckArchetype: 'Magistus' },
  { key: 'marincess', label: 'マリンセス', searchQuery: 'マリンセス', prodeckArchetype: 'Marincess' },
  { key: 'mathmech', label: '斬機', searchQuery: '斬機', prodeckArchetype: 'Mathmech' },
  { key: 'madolche', label: 'マドルチェ', searchQuery: 'マドルチェ', prodeckArchetype: 'Madolche' },
  { key: 'mayakashi', label: '魔妖', searchQuery: '魔妖', prodeckArchetype: 'Mayakashi' },
  { key: 'runick', label: '神碑', searchQuery: '神碑', prodeckArchetype: 'Runick' },
  { key: 'labrynth', label: 'ラビュリンス', searchQuery: 'ラビュリンス', prodeckArchetype: 'Labrynth' },
  { key: 'live_twin', label: 'ライブツイン', searchQuery: 'ライブツイン', prodeckArchetype: 'Live☆Twin' },
  { key: 'evil_twin', label: 'エヴィル・ツイン', searchQuery: 'エヴィル・ツイン', prodeckArchetype: 'Evil★Twin' },
  { key: 'rokket', label: 'ロイド', searchQuery: 'ロイド', prodeckArchetype: 'Rokket' },
  {
    key: 'blue_eyes',
    label: '青眼',
    searchQuery: '青眼',
    extraQueries: ['ブルーアイズ'],
    altArchetypes: ['Blue-Eyes'],
    anchorPasscodes: ['89631139'],
    prodeckArchetype: 'Blue-Eyes',
  },
  { key: 'white_forest', label: '白の森', searchQuery: '白の森', prodeckArchetype: 'White Forest' },
  {
    key: 'dark_magician',
    label: 'ブラック・マジシャン',
    searchQuery: 'ブラック・マジシャン',
    extraQueries: ['黒魔導', 'マジシャン'],
    altArchetypes: ['Dark Magician', 'Magician'],
    anchorPasscodes: ['46986414'],
    prodeckArchetype: 'Dark Magician',
  },
  { key: 'kashtira', label: 'クシャトリラ', searchQuery: 'クシャトリラ', prodeckArchetype: 'Kashtira' },
  { key: 'exosister', label: 'エクソシスター', searchQuery: 'エクソシスター', prodeckArchetype: 'Exosister' },
  { key: 'eldlich', label: 'エルドリッチ', searchQuery: 'エルドリッチ', prodeckArchetype: 'Eldlich' },
  { key: 'infernoid', label: 'インフェルノイド', searchQuery: 'インフェルノイド', prodeckArchetype: 'Infernoid' },
  { key: 'infernoble', label: '焔聖騎士', searchQuery: '焔聖騎士', prodeckArchetype: 'Infernoble Knight' },
  { key: 'virtual_world', label: '電脳堺', searchQuery: '電脳堺', prodeckArchetype: 'Virtual World' },
  { key: 'witchcrafter', label: '魔女術', searchQuery: '魔女術', prodeckArchetype: 'Witchcrafter' },
  { key: 'zoodiac', label: '十二獣', searchQuery: '十二獣', prodeckArchetype: 'Zoodiac' },
  { key: 'nekroz', label: 'ネクロス', searchQuery: 'ネクロス', prodeckArchetype: 'Nekroz' },
  { key: 'phantom_knights', label: '幻影騎士団', searchQuery: '幻影騎士', prodeckArchetype: 'The Phantom Knights' },
  { key: 'volcanic', label: 'ヴォルカニック', searchQuery: 'ヴォルカニック', prodeckArchetype: 'Volcanic' },
  { key: 'danger', label: '未界域', searchQuery: '未界域', prodeckArchetype: 'Danger!' },
  { key: 'snake_eye', label: '蛇眼', searchQuery: '蛇眼', prodeckArchetype: 'Snake-Eye' },
  { key: 'fire_king', label: '炎王', searchQuery: '炎王', prodeckArchetype: 'Fire King' },
  { key: 'icejade', label: '氷水', searchQuery: '氷水', prodeckArchetype: 'Icejade' },
  { key: 'ice_barrier', label: '氷結界', searchQuery: '氷結界', prodeckArchetype: 'Ice Barrier' },
  { key: 'cyber_dragon', label: 'サイバー・ドラゴン', searchQuery: 'サイバー・ドラゴン', prodeckArchetype: 'Cyber Dragon' },
  { key: 'stardust', label: 'スターダスト', searchQuery: 'スターダスト', prodeckArchetype: 'Stardust' },
  { key: 'synchron', label: 'シンクロン', searchQuery: 'シンクロン', prodeckArchetype: 'Synchron' },
  { key: 'scrap', label: 'スクラップ', searchQuery: 'スクラップ', prodeckArchetype: 'Scrap' },
  { key: 'subterror', label: 'サブテラー', searchQuery: 'サブテラー', prodeckArchetype: 'Subterror' },
  { key: 'traptrix', label: '蟲惑魔', searchQuery: '蟲惑魔', prodeckArchetype: 'Traptrix' },
  { key: 'true_draco', label: '真竜', searchQuery: '真竜', prodeckArchetype: 'True Draco' },
  { key: 'therion', label: 'セリオンズ', searchQuery: 'セリオンズ', prodeckArchetype: 'Therion' },
  { key: 'thunder_dragon', label: '雷龍', searchQuery: '雷龍', prodeckArchetype: 'Thunder Dragon' },
  { key: 'tellarknight', label: '星因士', searchQuery: '星因士', prodeckArchetype: 'tellarknight' },
  { key: 'ritual_beast', label: '霊獣', searchQuery: '霊獣', prodeckArchetype: 'Ritual Beast' },
  { key: 'yang_zing', label: '竜星', searchQuery: '竜星', prodeckArchetype: 'Yang Zing' },
  { key: 'yosenju', label: '妖仙獣', searchQuery: '妖仙獣', prodeckArchetype: 'Yosenju' },
  { key: 'gusto', label: 'ガスタ', searchQuery: 'ガスタ', prodeckArchetype: 'Gusto' },
  { key: 'gravekeeper', label: '墓守', searchQuery: '墓守', prodeckArchetype: "Gravekeeper's" },
  { key: 'harpie', label: 'ハーピィ', searchQuery: 'ハーピィ', prodeckArchetype: 'Harpie' },
  {
    key: 'invoked',
    label: '召喚獣',
    searchQuery: 'インヴォーク',
    extraQueries: ['召喚獣', '召喚師', 'アレイスター', 'カリキュンク', 'ミゼット', 'エルシャドール'],
    altArchetypes: ['Aleister the Invoker'],
    anchorPasscodes: ['14558127', '74063034'],
    prodeckArchetype: 'Invoked',
  },
  { key: 'knightmare', label: 'トロイメア', searchQuery: 'トロイメア', prodeckArchetype: 'Knightmare' },
  { key: 'lunalight', label: '月光', searchQuery: '月光', prodeckArchetype: 'Lunalight' },
  { key: 'mermail', label: '水精鱗', searchQuery: '水精鱗', prodeckArchetype: 'Mermail' },
  { key: 'metalfoes', label: 'メタルフォーゼ', searchQuery: 'メタルフォーゼ', prodeckArchetype: 'Metalfoes' },
  { key: 'mikanko', label: '御巫', searchQuery: '御巫', prodeckArchetype: 'Mikanko' },
  { key: 'photon', label: 'フォトン', searchQuery: 'フォトン', prodeckArchetype: 'Photon' },
  { key: 'raidraptor', label: 'ＲＲ', searchQuery: 'ＲＲ', prodeckArchetype: 'Raidraptor' },
  { key: 'resonator', label: '共鳴者', searchQuery: '共鳴者', prodeckArchetype: 'Resonator' },
  { key: 'blackwing', label: 'ＢＦ', searchQuery: 'ＢＦ', prodeckArchetype: 'Blackwing' },
  { key: 'crystron', label: 'クリストロン', searchQuery: 'クリストロン', prodeckArchetype: 'Crystron' },
  { key: 'world_legacy', label: '星杯', searchQuery: '星杯', prodeckArchetype: 'World Legacy' },
  { key: 'abc', label: 'ＡＢＣ', searchQuery: 'ＡＢＣ', prodeckArchetype: 'ABC' },
  { key: 'zenmai', label: 'ゼンマイ', searchQuery: 'ゼンマイ', prodeckArchetype: 'Wind-Up' },
  { key: 'suship', label: 'おすし', searchQuery: 'おすし', prodeckArchetype: 'Suship' },
  { key: 'timelord', label: '時械神', searchQuery: '時械神', prodeckArchetype: 'Timelord' },
  { key: 'agent', label: '代行者', searchQuery: '代行者', prodeckArchetype: 'The Agent' },
  { key: 'qli', label: 'クリフォート', searchQuery: 'クリフォート', prodeckArchetype: 'Qli' },
  { key: 'spellbook', label: '魔導', searchQuery: '魔導', prodeckArchetype: 'Spellbook' },
  { key: 'constellar', label: 'セイクリッド', searchQuery: 'セイクリッド', prodeckArchetype: 'Constellar' },
  { key: 'x_saber', label: 'Ｘ－セイバー', searchQuery: 'Ｘ－セイバー', prodeckArchetype: 'X-Saber' },
  { key: 'reptilianne', label: 'レプティレス', searchQuery: 'レプティレス', prodeckArchetype: 'Reptilianne' },
  { key: 'vampire', label: 'ヴァンパイア', searchQuery: 'ヴァンパイア', prodeckArchetype: 'Vampire' },
  { key: 'warrock', label: 'ウォークライ', searchQuery: 'ウォークライ', prodeckArchetype: 'War Rock' },
  { key: 'spyral', label: 'スパイラル', searchQuery: 'スパイラル', prodeckArchetype: 'SPYRAL' },
  { key: 'speedroid', label: 'スピードロイド', searchQuery: 'スピードロイド', prodeckArchetype: 'Speedroid' },
  { key: 'paleozoic', label: 'バージェスト', searchQuery: 'バージェスト', prodeckArchetype: 'Paleozoic' },
  { key: 'train', label: 'ロイド・トロイコ', searchQuery: 'トロイコ', prodeckArchetype: 'Train' },
  { key: 'simorgh', label: 'シムルグ', searchQuery: 'シムルグ', prodeckArchetype: 'Simorgh' },
  { key: 'zefra', label: 'ＺＥＦＲＡ', searchQuery: 'ゼフラ', prodeckArchetype: 'Zefra' },
  { key: 'nordic', label: '極星', searchQuery: '極星', prodeckArchetype: 'Nordic' },
  { key: 'mistvalley', label: '霞の谷', searchQuery: '霞の谷', prodeckArchetype: 'Mist Valley' },
  { key: 'koa_ki', label: 'コアキメイル', searchQuery: 'コアキメイル', prodeckArchetype: "Koa'ki Meiru" },
  { key: 'gaia', label: 'ガイア', searchQuery: 'ガイア', prodeckArchetype: 'Gaia The Fierce Knight' },
  { key: 'gate_guardian', label: 'ゲート・ガーディアン', searchQuery: 'ゲート・ガーディアン', prodeckArchetype: 'Gate Guardian' },
  { key: 'chronomaly', label: '先史遺産', searchQuery: '先史遺産', prodeckArchetype: 'Chronomaly' },
  { key: 'bujin', label: '武神', searchQuery: '武神', prodeckArchetype: 'Bujin' },
  { key: 'burning_abyss', label: 'ＢＡ', searchQuery: 'ＢＡ', prodeckArchetype: 'Burning Abyss' },
  { key: 'dino', label: '恐竜', searchQuery: 'ダイナック', prodeckArchetype: null },
  { key: 'dogmatika', label: 'ドラグマ', searchQuery: 'ドラグマ', prodeckArchetype: 'Dogmatika' },
  {
    key: 'despia',
    label: 'デスピア',
    searchQuery: 'デスピア',
    extraQueries: ['烙印', 'アルバゾ'],
    altArchetypes: ['Branded', 'Fallen of Albaz'],
    prodeckArchetype: 'Despia',
  },
  {
    key: 'branded',
    label: '烙印',
    searchQuery: '烙印',
    extraQueries: ['落胤', 'アルバゾ'],
    altArchetypes: ['Despia', 'Fallen of Albaz'],
    prodeckArchetype: 'Branded',
  },
  { key: 'spright', label: 'スプライト', searchQuery: 'スプライト', prodeckArchetype: 'Spright' },
  { key: 'punk', label: 'Ｐｕｎｋ', searchQuery: 'Ｐｕｎｋ', prodeckArchetype: 'P.U.N.K.' },
  { key: 'rissole', label: 'リソル', searchQuery: 'リソル', prodeckArchetype: null },
  { key: 'voiceless_voice', label: '響き合う', searchQuery: '響き合う', prodeckArchetype: null },
  { key: 'yubel', label: 'ユベル', searchQuery: 'ユベル', prodeckArchetype: 'Yubel' },
  { key: 'horus', label: 'ホルス', searchQuery: 'ホルス', prodeckArchetype: 'Horus' },
  { key: 'ryzeal', label: 'ライゼオル', searchQuery: 'ライゼオル', prodeckArchetype: 'Ryzeal' },
  { key: 'maliss', label: 'マリス', searchQuery: 'マリス', prodeckArchetype: 'Maliss' },
  { key: 'regenesis', label: 'リジェネシス', searchQuery: 'リジェネシス', prodeckArchetype: 'Regenesis' },
].sort((a, b) => a.label.localeCompare(b.label, 'ja'))

const THEME_BY_KEY = new Map(CARD_THEME_OPTIONS.map((t) => [t.key, t]))

export function getThemeByKey(key) {
  return THEME_BY_KEY.get(key) ?? null
}

/** 百鸽に投げる検索語（重複除去） */
export function themeYgocdbQueries(theme) {
  const seen = new Set()
  const out = []
  for (const q of [theme?.searchQuery, ...(theme?.extraQueries ?? [])]) {
    const t = String(q ?? '').trim()
    if (t.length < 2 || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** YGOPRODeck の archetype パラメータ（重複除去） */
export function themeProdeckArchetypes(theme) {
  const seen = new Set()
  const out = []
  for (const a of [theme?.prodeckArchetype, ...(theme?.altArchetypes ?? [])]) {
    const t = String(a ?? '').trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}
