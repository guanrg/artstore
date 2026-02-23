"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

type ProductGalleryProps = {
  title: string
  imageUrls: string[]
  labels?: {
    close: string
    prev: string
    next: string
    noImage: string
  }
}

export function ProductGallery({ title, imageUrls, labels }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (imageUrls.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % imageUrls.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [imageUrls.length])

  if (!imageUrls.length) {
    return (
        <div className="mt-6 flex h-72 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        {labels?.noImage ?? "No image"}
        </div>
      )
  }

  const active = imageUrls[activeIndex] ?? imageUrls[0]

  return (
    <>
      <div className="mt-6 space-y-3">
        <button
          type="button"
          className="block w-full overflow-hidden rounded-xl bg-slate-100"
          onClick={() => setIsOpen(true)}
        >
          <Image
            key={active}
            src={active}
            alt={title}
            width={960}
            height={540}
            className="fade-soft h-72 w-full object-cover"
          />
        </button>

        {imageUrls.length > 1 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {imageUrls.map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`overflow-hidden rounded-lg bg-slate-100 ring-2 ${
                  idx === activeIndex ? "ring-orange-500" : "ring-transparent"
                }`}
              >
                <Image
                  src={url}
                  alt={`${title} ${idx + 1}`}
                  width={220}
                  height={160}
                  className="h-24 w-full object-cover md:h-20"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute right-4 top-4 rounded bg-white/90 px-3 py-1 text-sm font-medium text-slate-900"
            onClick={() => setIsOpen(false)}
          >
            {labels?.close ?? "Close"}
          </button>

          <div className="relative inline-flex items-center justify-center">
            {imageUrls.length > 1 ? (
              <button
                type="button"
                className="absolute -left-3 z-10 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 shadow-md"
                onClick={() => setActiveIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)}
              >
                {labels?.prev ?? "Prev"}
              </button>
            ) : null}

            <Image
              key={`modal-${active}`}
              src={active}
              alt={title}
              width={1600}
              height={1200}
              className="fade-soft max-h-[88vh] w-auto max-w-[92vw] rounded-lg object-contain"
            />

            {imageUrls.length > 1 ? (
              <button
                type="button"
                className="absolute -right-3 z-10 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 shadow-md"
                onClick={() => setActiveIndex((prev) => (prev + 1) % imageUrls.length)}
              >
                {labels?.next ?? "Next"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
