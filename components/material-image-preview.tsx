/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import { Expand, X } from 'lucide-react'

type MaterialImagePreviewProps = {
  src: string
  alt: string
}

export function MaterialImagePreview({ src, alt }: MaterialImagePreviewProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return <>
    <button className="lesson-image-button" type="button" onClick={() => setOpen(true)} aria-label={`Lihat gambar penuh: ${alt}`}>
      <img src={src} alt={alt} />
      <span><Expand />Lihat gambar penuh</span>
    </button>
    {open && <div className="lesson-image-dialog" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
      <div className="lesson-image-dialog-content" onClick={event => event.stopPropagation()}>
        <button className="lesson-image-close" type="button" onClick={() => setOpen(false)} aria-label="Tutup preview gambar"><X /></button>
        <img src={src} alt={alt} />
      </div>
    </div>}
  </>
}
