import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { fetchRawFromBulletin } from '../../lib/bulletin-storage'
import { getCachedImage } from './config'

/**
 * Renders an image stored on Bulletin by CID.
 * Tries the local data-URL cache first (instant, survives gateway lag),
 * then falls back to fetching the bytes from the Bulletin gateway.
 */
export function BulletinImage({ cid, alt, className }: { cid: string; alt?: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(() => getCachedImage(cid))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    const cached = getCachedImage(cid)
    if (cached) {
      setSrc(cached)
      return
    }
    let active = true
    fetchRawFromBulletin(cid)
      .then(bytes => {
        if (!active) return
        const url = URL.createObjectURL(new Blob([bytes]))
        revoked = url
        setSrc(url)
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [cid])

  if (failed) {
    return (
      <div className={`flex items-center justify-center gap-2 text-[#a8a29e] text-sm bg-[#fafaf9] ${className ?? ''}`}>
        <ImageOff className="w-5 h-5" /> Image unavailable
      </div>
    )
  }

  if (!src) {
    return <div className={`bg-[#f5f5f4] animate-pulse ${className ?? ''}`} />
  }

  return <img src={src} alt={alt ?? ''} className={className} />
}
