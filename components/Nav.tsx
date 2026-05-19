'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Nav() {
  const [user, setUser] = useState<any>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        dev<span>market</span>
      </Link>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {checked && (
          user ? (
            <Link href="/dashboard">
              <button className="btn-primary" style={{ padding: '8px 16px' }}>dashboard →</button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <button className="btn-ghost" style={{ padding: '8px 16px' }}>login</button>
              </Link>
              <Link href="/signup">
                <button className="btn-primary" style={{ padding: '8px 16px' }}>start selling →</button>
              </Link>
            </>
          )
        )}
      </div>
    </nav>
  )
}
