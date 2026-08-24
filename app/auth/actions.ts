'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

const credentialsSchema = z.object({
  email: z.string().email('Ugyldig e-postadresse'),
  password: z.string().min(6, 'Passordet må ha minst 6 tegn'),
})

async function getOrigin() {
  const headerStore = await headers()
  return (
    headerStore.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  )
}

function safeNextPath(value: FormDataEntryValue | null) {
  const next = typeof value === 'string' ? value : '/'
  return next.startsWith('/') ? next : '/spraakhjelper'
}

export async function login(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    redirect(
      `/auth/error?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Ugyldig innlogging')}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect(safeNextPath(formData.get('next')))
}

export async function signup(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    redirect(
      `/auth/error?error=${encodeURIComponent(parsed.error.errors[0]?.message ?? 'Ugyldig registrering')}`
    )
  }

  const origin = await getOrigin()
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/auth/sign-up-success')
}

export async function forgotPassword(formData: FormData) {
  const email = z.string().email().safeParse(formData.get('email'))
  if (!email.success) {
    redirect('/auth/error?error=Ugyldig%20e-postadresse')
  }

  const origin = await getOrigin()
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  })

  if (error) {
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  redirect(
    '/auth/login?message=Sjekk e-posten din for en lenke til å tilbakestille passordet'
  )
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    redirect('/auth/error?error=Passordene stemmer ikke overens')
  }

  if (!password || password.length < 6) {
    redirect('/auth/error?error=Passordet må ha minst 6 tegn')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/spraakhjelper')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}
