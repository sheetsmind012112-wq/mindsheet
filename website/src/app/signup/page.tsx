'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ScrollReveal from '@/components/ScrollReveal'
import { signUp, openOAuthPopup, exchangeOAuthTokens, storeTokens, storeUser } from '@/lib/auth'

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Please fill in all required fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const name = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0]
      await signUp(email, password, name)
      setSuccess('Account created! Please check your email to verify.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    setError('')
    setSuccess('')
    setGoogleLoading(true)
    try {
      const tokens = await openOAuthPopup()
      const data = await exchangeOAuthTokens(tokens.access_token, tokens.refresh_token)
      storeTokens(data.access_token, data.refresh_token, data.expires_at)
      storeUser(data.user)
      setSuccess('Account created! Redirecting...')
      // Redirect to homepage or dashboard after a brief moment
      setTimeout(() => { window.location.href = '/' }, 1000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign up failed.'
      if (msg !== 'Authentication cancelled') setError(msg)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="pt-28 lg:pt-36 pb-24 lg:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />

        <div className="relative max-w-lg mx-auto px-6 lg:px-8">
          <ScrollReveal className="text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M4 4h6v6H4V4Z" fill="currentColor" opacity="0.4" />
                <path d="M14 4h6v6h-6V4Z" fill="currentColor" opacity="0.6" />
                <path d="M4 14h6v6H4v-6Z" fill="currentColor" opacity="0.6" />
                <path d="M14 14h6v6h-6v-6Z" fill="currentColor" />
                <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
              Get started with SheetMind
            </h1>
            <p className="mt-3 text-slate-500">
              Create your account and start using AI inside Google Sheets.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="glass-card rounded-2xl p-8 shadow-xl shadow-slate-200/50">
              {/* Error / success banners */}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {/* Google sign up */}
              <button
                onClick={handleGoogleSignUp}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-display font-semibold text-sm text-slate-700 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Email form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
                    <input
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="8+ characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="btn-primary w-full text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-slate-400 text-center mt-5 leading-relaxed">
                By signing up you agree to our{' '}
                <Link href="/terms" className="text-emerald-600 hover:underline">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200} className="text-center mt-6">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-emerald-600 hover:underline">Log in</Link>
            </p>
          </ScrollReveal>

          {/* Trust signals */}
          <ScrollReveal delay={300} className="mt-10">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
              {[
                'No credit card required',
                '5 free messages',
                'Cancel anytime',
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-emerald-500"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {item}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  )
}
