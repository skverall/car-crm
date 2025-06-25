import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import MainApp from '@/components/MainApp'
import AuthForm from '@/components/AuthForm'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <AuthForm />
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <MainApp />
    </Suspense>
  )
}

