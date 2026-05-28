import { useEffect, useMemo, useState } from 'react'
import { CardArtWatermarkOverlay } from '../lib/cardUi.jsx'
import { setCodeFromCollectionId } from '../lib/collectionCardId.js'
import {
  collectionImageCandidates,
  resolvePasscodeBySetCode,
} from '../lib/collectionImage.js'
import { cardImageUrl } from '../lib/ygoCdb.js'

export default function CollectionCardArt({ card, customSrc, rarity }) {
  const candidates = useMemo(
    () => collectionImageCandidates(card, customSrc),
    [card, customSrc],
  )
  const [srcIndex, setSrcIndex] = useState(0)
  const [extraUrls, setExtraUrls] = useState([])
  const [lookupDone, setLookupDone] = useState(false)

  const allUrls = useMemo(
    () => [...new Set([...candidates, ...extraUrls])],
    [candidates, extraUrls],
  )
  const src = allUrls[srcIndex] ?? ''
  const exhausted = allUrls.length > 0 && srcIndex >= allUrls.length
  const showPlaceholder = exhausted || (allUrls.length === 0 && lookupDone)
  const showImage = Boolean(src) && !exhausted

  useEffect(() => {
    setSrcIndex(0)
    setExtraUrls([])
    setLookupDone(false)
  }, [card.id, customSrc, card.imageUrl, card.passcode])

  useEffect(() => {
    if (
      allUrls.length === 0 &&
      !lookupDone &&
      /^[A-Z0-9]{2,8}-JP/i.test(setCodeFromCollectionId(card.id) ?? '')
    ) {
      const controller = new AbortController()
      setLookupDone(true)
      resolvePasscodeBySetCode(setCodeFromCollectionId(card.id), controller.signal)
        .then((passcode) => {
          if (!passcode) return
          setExtraUrls([
            cardImageUrl(passcode, { lang: 'jp', size: 'full' }),
            cardImageUrl(passcode, { lang: 'ygopro', size: 'full' }),
          ])
          setSrcIndex(0)
        })
        .catch(() => {})
      return () => controller.abort()
    }
    return undefined
  }, [allUrls.length, lookupDone, card.id])

  function handleError() {
    setSrcIndex((i) => i + 1)
  }

  return (
    <>
      {showImage ? (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={handleError}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-md border border-amber-200/30 bg-zinc-950/50 px-2 py-1 text-[10px] text-amber-100/90">
            ADD IMAGE
          </span>
        </div>
      )}
      <CardArtWatermarkOverlay rarity={rarity} />
    </>
  )
}
