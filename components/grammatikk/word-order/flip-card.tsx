'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FlipCardProps {
  flipped: boolean
  front: ReactNode
  back: ReactNode
  className?: string
}

// A card that flips between two faces with a 3D rotateY animation. Both faces
// are absolutely positioned and overlaid; the wrapper height follows whichever
// face is currently showing so cards of different heights animate smoothly.
export function FlipCard({ flipped, front, back, className }: FlipCardProps) {
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const measure = () => {
      const el = flipped ? backRef.current : frontRef.current
      if (el) setHeight(el.offsetHeight)
    }
    measure()

    // Keep the height in sync if either face's content changes size.
    const observer = new ResizeObserver(measure)
    if (frontRef.current) observer.observe(frontRef.current)
    if (backRef.current) observer.observe(backRef.current)
    return () => observer.disconnect()
  }, [flipped])

  return (
    <div
      className={cn('[perspective:1600px]', className)}
      style={{ height, transition: 'height 300ms ease' }}
    >
      <div
        className={cn(
          'relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]',
          flipped && '[transform:rotateY(180deg)]'
        )}
      >
        <div
          ref={frontRef}
          aria-hidden={flipped}
          className={cn(
            'absolute inset-x-0 top-0 [backface-visibility:hidden]',
            flipped && 'pointer-events-none'
          )}
        >
          {front}
        </div>
        <div
          ref={backRef}
          aria-hidden={!flipped}
          className={cn(
            'absolute inset-x-0 top-0 [backface-visibility:hidden] [transform:rotateY(180deg)]',
            !flipped && 'pointer-events-none'
          )}
        >
          {back}
        </div>
      </div>
    </div>
  )
}
