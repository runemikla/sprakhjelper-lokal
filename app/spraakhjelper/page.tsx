import SpraakhjelpperClient from './spraakhjelper-client'

export default function SpraakhjelpperPage() {
  // Mock user for local testing without authentication
  const mockUser = {
    id: 'local-user',
    email: 'test@example.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  }

  return <SpraakhjelpperClient user={mockUser as any} />
}

