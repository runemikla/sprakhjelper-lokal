'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { OM_SECTIONS } from '@/components/om/sections'

// Desktop dropdown «Om Språkhjelp» in the navbar.
export function OmMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-gray-700 hover:text-blue-600 transition-colors font-medium"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        Om Språkhjelp
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Om Språkhjelp"
          className="absolute right-0 top-full z-50 mt-2 min-w-[13rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {OM_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              role="menuitem"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              {section.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Mobile menu section with the same links.
export function OmMobileLinks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Om Språkhjelp
      </p>
      {OM_SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="block px-4 text-gray-700 hover:text-blue-600 transition-colors font-medium"
          onClick={onNavigate}
        >
          {section.label}
        </Link>
      ))}
    </div>
  )
}
