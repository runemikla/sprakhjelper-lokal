import { AppNavbar } from '@/components/landing/app-navbar'
import { FjordBackground } from '@/components/landing/fjord-background'

interface AuthShellProps {
  children: React.ReactNode
}

// Shared fjord background for all auth screens, matching the landing/tilgang pages.
export async function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen">
      <FjordBackground />

      <AppNavbar />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-2 sm:px-4 pt-24 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
