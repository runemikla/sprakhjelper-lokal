'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

export const KI_TOOLS = [
  { href: '/spraakhjelper', label: 'Språkhjelperen', clearsSession: true },
  { href: '/grammatikk', label: 'Grammatikk øving', clearsSession: false },
  { href: '/lytteoving', label: 'Lytteøving', clearsSession: false },
] as const

function openTool(href: string, clearsSession: boolean, router: ReturnType<typeof useRouter>) {
  if (clearsSession && globalThis.window !== undefined) {
    sessionStorage.clear()
  }
  router.push(href)
}

interface KiToolsMenuProps {
  onNavigate?: () => void
}

export function KiToolsMenu({ onNavigate }: KiToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

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

  function handleToolClick(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    clearsSession: boolean
  ) {
    event.preventDefault()
    setIsOpen(false)
    onNavigate?.()
    openTool(href, clearsSession, router)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-gray-700 hover:text-blue-600 transition-colors font-medium"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        KI-verktøy
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="KI-verktøy"
          className="absolute left-0 top-full z-50 mt-2 min-w-[12rem] rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {KI_TOOLS.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              role="menuitem"
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600"
              onClick={(event) => handleToolClick(event, tool.href, tool.clearsSession)}
            >
              {tool.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

interface KiToolsMobileLinksProps {
  onNavigate: () => void
}

export function KiToolsMobileLinks({ onNavigate }: KiToolsMobileLinksProps) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        KI-verktøy
      </p>
      {KI_TOOLS.map((tool) =>
        tool.clearsSession ? (
          <a
            key={tool.href}
            href={tool.href}
            className="block px-4 text-gray-700 hover:text-blue-600 transition-colors font-medium"
            onClick={(event) => {
              event.preventDefault()
              onNavigate()
              openTool(tool.href, true, router)
            }}
          >
            {tool.label}
          </a>
        ) : (
          <Link
            key={tool.href}
            href={tool.href}
            className="block px-4 text-gray-700 hover:text-blue-600 transition-colors font-medium"
            onClick={onNavigate}
          >
            {tool.label}
          </Link>
        )
      )}
    </div>
  )
}
