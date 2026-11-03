import { redirect } from 'next/navigation'

// Old links to /ordlister/... open «Lær ord».
export default function OrdlisterRestPage() {
  redirect('/laer-ord')
}
