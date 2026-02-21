'use client'

import { useEffect, useState, useRef } from 'react'
import { getUser, isLoggedIn, clearTokens, type UserData } from '@/lib/auth'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })

    // Check login state
    setLoggedIn(isLoggedIn())
    setUser(getUser())

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    clearTokens()
    setLoggedIn(false)
    setUser(null)
    setDropdownOpen(false)
    window.location.href = '/'
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?'

  const tierLabel = user?.tier === 'pro' ? 'Pro' : user?.tier === 'team' ? 'Team' : 'Free'
  const tierColor = user?.tier === 'pro' ? 'text-emerald-600 bg-emerald-50' : user?.tier === 'team' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'

  const links = [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M4 4h6v6H4V4Z" fill="currentColor" opacity="0.4" />
                <path d="M14 4h6v6h-6V4Z" fill="currentColor" opacity="0.6" />
                <path d="M4 14h6v6H4v-6Z" fill="currentColor" opacity="0.6" />
                <path d="M14 14h6v6h-6v-6Z" fill="currentColor" />
                <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" fill="currentColor" opacity="0.9" />
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-slate-900 tracking-tight">
              Sheet<span className="text-emerald-600">Mind</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 rounded-lg hover:bg-emerald-50/60 transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA / Avatar + Mobile toggle */}
          <div className="flex items-center gap-3">
            {loggedIn ? (
              /* ── Logged-in avatar ── */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="relative group"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || 'Avatar'}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-emerald-400 transition-all duration-200 shadow-sm group-hover:shadow-md"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent group-hover:ring-emerald-400 transition-all duration-200 shadow-sm group-hover:shadow-md">
                      {initials}
                    </div>
                  )}
                  {/* Online dot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-sm font-bold">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
                          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${tierColor}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" />
                          </svg>
                          {tierLabel} Plan
                        </span>
                      </div>
                    </div>
                    <div className="p-2">
                      {user?.tier === 'free' && (
                        <a
                          href="/#pricing"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                          Upgrade Plan
                        </a>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Not logged in ── */
              <a
                href="/signup"
                className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                Get Started Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-96 border-t border-slate-100' : 'max-h-0'
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl px-6 py-4 space-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 text-sm font-medium text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/60 rounded-xl transition-colors"
            >
              {link.label}
            </a>
          ))}
          {loggedIn ? (
            <>
              <div className="px-4 py-3 flex items-center gap-3">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</p>
                  <span className={`inline-flex text-xs font-semibold ${tierColor} px-2 py-0.5 rounded-md`}>{tierLabel}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Log Out
              </button>
            </>
          ) : (
            <a
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="block text-center mt-3 px-5 py-3 rounded-xl font-display font-semibold text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-500"
            >
              Get Started Free
            </a>
          )}
        </div>
      </div>
    </nav>
  )
}
