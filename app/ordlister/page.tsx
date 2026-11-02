import { redirect } from 'next/navigation'

// «Ordlister» is now part of «Lær ord».
export default function OrdlisterPage() {
  redirect('/laer-ord')
}
