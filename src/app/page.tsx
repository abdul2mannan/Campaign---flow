import { redirect } from 'next/navigation'

export default function IndexPage() {
  redirect('/flows/new')
  return null
}
