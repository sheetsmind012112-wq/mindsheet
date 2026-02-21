'use client'

import { useEffect, useState } from 'react'

/* Google Sheets logo — the official green spreadsheet icon */
function GoogleSheetsLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M29 4H13a4 4 0 00-4 4v32a4 4 0 004 4h22a4 4 0 004-4V14L29 4z" fill="#43A047" />
      <path d="M29 4v10h10L29 4z" fill="#C8E6C9" />
      <path d="M33 22H15v14h18V22z" fill="#E8F5E9" />
      <path d="M33 22H15v3h18v-3zm0 5.5H15v3h18v-3zm0 5.5H15v3h18v-3z" fill="#43A047" opacity="0.4" />
      <path d="M23 22v14M15 25h18M15 28.5h18M15 32h18" stroke="#43A047" strokeWidth="0.5" opacity="0.3" />
    </svg>
  )
}

export default function DashboardMock() {
  const [typed, setTyped] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTyped(true), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-12 lg:mt-16">
      {/* Floating decorative elements */}
      <div className="absolute -top-8 -left-6 w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200/60 flex items-center justify-center animate-float shadow-lg shadow-emerald-100/50 z-10">
        <GoogleSheetsLogo size={28} />
      </div>

      <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center animate-float-delayed shadow-lg shadow-amber-100/50 z-10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-500">
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6L12 2Z" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute -bottom-6 -left-4 w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center animate-float-slow shadow-lg shadow-blue-100/50 z-10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-500">
          <rect x="3" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.5" />
          <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" opacity="0.7" />
          <rect x="17" y="4" width="4" height="16" rx="1" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute -bottom-4 -right-6 w-14 h-14 rounded-2xl bg-green-50 border border-green-200/60 flex items-center justify-center animate-float shadow-lg shadow-green-100/50 z-10" style={{ animationDelay: '3s' }}>
        <GoogleSheetsLogo size={28} />
      </div>

      {/* Glow effect behind the mock */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-200/30 via-emerald-100/20 to-transparent rounded-3xl blur-3xl scale-105 -z-10" />

      {/* Main dashboard container */}
      <div className="dashboard-shadow rounded-2xl overflow-hidden bg-white border border-slate-200/80">
        {/* Google Sheets title bar */}
        <div className="bg-[#f9fbfd] border-b border-slate-200/60 px-4 py-2 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <GoogleSheetsLogo size={22} />
            <div>
              <span className="text-sm font-medium text-slate-700">Sales Data Q4</span>
              <div className="flex items-center gap-1 mt-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-slate-400">
                  <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" fill="currentColor" />
                </svg>
                <span className="text-[10px] text-slate-400">All changes saved in Drive</span>
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-0.5">
            {['File', 'Edit', 'View', 'Insert', 'Format', 'Data'].map((item) => (
              <span key={item} className="text-[11px] text-slate-600 px-2.5 py-1 rounded-md hover:bg-slate-200/60 cursor-default">{item}</span>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* Share button */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c2e7ff] text-[11px] font-medium text-[#001d35]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
              </svg>
              Share
            </div>
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">U</span>
            </div>
          </div>
        </div>

        {/* Google Sheets toolbar */}
        <div className="hidden sm:flex items-center gap-1 bg-[#edf2fa] border-b border-slate-200/40 px-3 py-1">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-300/30">
            <div className="p-1 rounded hover:bg-slate-300/30 cursor-default">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13" /></svg>
            </div>
            <div className="p-1 rounded hover:bg-slate-300/30 cursor-default">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016.69 3L21 13" /></svg>
            </div>
          </div>
          {/* Font */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-300/30">
            <span className="text-[11px] text-[#5f6368] px-1.5 py-0.5 rounded hover:bg-slate-300/30 cursor-default">Arial</span>
            <span className="text-[11px] text-[#5f6368] px-1.5 py-0.5 rounded hover:bg-slate-300/30 cursor-default w-6 text-center">10</span>
          </div>
          {/* Bold/Italic */}
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-300/30">
            <div className="p-1 rounded hover:bg-slate-300/30 cursor-default"><span className="text-[12px] font-bold text-[#5f6368]">B</span></div>
            <div className="p-1 rounded hover:bg-slate-300/30 cursor-default"><span className="text-[12px] italic text-[#5f6368]">I</span></div>
            <div className="p-1 rounded hover:bg-slate-300/30 cursor-default"><span className="text-[12px] underline text-[#5f6368]">U</span></div>
          </div>
          {/* Colors */}
          <div className="flex items-center gap-0.5 px-2">
            <div className="p-1 rounded hover:bg-slate-300/30 cursor-default">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20h16" stroke="#5f6368" strokeWidth="3" strokeLinecap="round" /><path d="M12 4l5 12H7l5-12z" fill="#5f6368" opacity="0.6" /></svg>
            </div>
            <div className="p-1 rounded hover:bg-slate-300/30 cursor-default">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="16" width="18" height="4" rx="1" fill="#fbbc04" /><path d="M12 4l5 10H7l5-10z" fill="#5f6368" opacity="0.5" /></svg>
            </div>
          </div>
        </div>

        {/* Formula bar */}
        <div className="bg-white border-b border-slate-200/60 px-3 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#5f6368] bg-white px-2 py-0.5 rounded border border-slate-200 min-w-[36px] text-center">B4</span>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-[11px] text-[#5f6368] font-medium px-1">fx</span>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-[11px] text-[#5f6368]">$67,800</span>
        </div>

        {/* Main content area */}
        <div className="flex min-h-[380px] lg:min-h-[420px]">
          {/* Spreadsheet grid */}
          <div className="flex-1 overflow-hidden">
            {/* Column headers */}
            <div className="flex border-b border-slate-200/60 bg-[#f8f9fa]">
              <div className="w-10 min-w-[40px] border-r border-slate-200/40" />
              {['A', 'B', 'C', 'D'].map((col) => (
                <div key={col} className="flex-1 min-w-[80px] px-3 py-1 text-center text-[11px] font-medium text-[#5f6368] border-r border-slate-200/40">
                  {col}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {[
              { n: 1, cells: ['Company', 'Revenue', 'Region', 'Status'], header: true },
              { n: 2, cells: ['Acme Corp', '$45,200', 'West', 'Active'] },
              { n: 3, cells: ['Beta Labs', '$32,100', 'East', 'Active'] },
              { n: 4, cells: ['Gamma Inc', '$67,800', 'West', 'Active'], highlighted: true },
              { n: 5, cells: ['Delta Co', '$28,500', 'North', 'Pending'] },
              { n: 6, cells: ['Epsilon Ltd', '$51,300', 'East', 'Active'], highlighted: true },
              { n: 7, cells: ['Zeta Group', '$39,700', 'West', 'Active'] },
              { n: 8, cells: ['Eta LLC', '$22,400', 'North', 'Active'] },
              { n: 9, cells: ['', '', '', ''] },
              { n: 10, cells: ['', '', '', ''] },
            ].map((row) => (
              <div
                key={row.n}
                className={`flex border-b border-slate-100/60 ${
                  row.highlighted ? 'bg-emerald-50/40' : row.header ? 'bg-[#f8f9fa]' : 'bg-white'
                }`}
              >
                <div className="w-10 min-w-[40px] px-1 py-1.5 text-center text-[11px] text-[#80868b] border-r border-slate-200/40 flex-shrink-0 bg-[#f8f9fa]">
                  {row.n}
                </div>
                {row.cells.map((cell, i) => (
                  <div
                    key={i}
                    className={`flex-1 min-w-[80px] px-3 py-1.5 text-[11px] border-r border-slate-100/40 truncate ${
                      row.header ? 'font-bold text-[#202124]' : 'text-[#3c4043]'
                    } ${row.highlighted && i === 1 ? 'text-emerald-700 font-semibold' : ''}
                    ${row.highlighted ? 'ring-1 ring-inset ring-emerald-200/50' : ''}`}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ============ SheetMind Sidebar Panel ============ */}
          <div className="w-[240px] lg:w-[280px] border-l border-slate-200 bg-white flex flex-col flex-shrink-0">

            {/* Sidebar Header — matches actual Header.tsx */}
            <div className="flex-shrink-0 border-b border-slate-100">
              {/* Top accent bar */}
              <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500" />
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  {/* Logo */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                        <path d="M4 4h6v6H4V4Z" fill="currentColor" opacity="0.4" />
                        <path d="M14 4h6v6h-6V4Z" fill="currentColor" opacity="0.6" />
                        <path d="M4 14h6v6H4v-6Z" fill="currentColor" opacity="0.6" />
                        <path d="M14 14h6v6h-6v-6Z" fill="currentColor" />
                        <path d="M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2Z" fill="currentColor" opacity="0.9" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-display font-bold text-[11px]">
                        <span className="text-slate-900">Sheet</span>
                        <span className="text-emerald-600">Mind</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300" />
                        <span className="text-[8px] text-slate-400 font-medium">Connected</span>
                      </div>
                    </div>
                  </div>
                  {/* Header actions */}
                  <div className="flex items-center gap-0.5">
                    <span className="px-1.5 py-0.5 text-[8px] font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full">PRO</span>
                    {/* History */}
                    <div className="p-1 rounded-md text-slate-400 hover:bg-slate-50 cursor-default">
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {/* New chat */}
                    <div className="p-1 rounded-md text-slate-400 hover:bg-slate-50 cursor-default">
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    {/* User avatar */}
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
                      <span className="text-[8px] font-bold">M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat messages — matches actual MessageArea.tsx styles */}
            <div className="flex-1 px-2.5 py-2.5 space-y-2.5 overflow-hidden">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-2xl px-3 py-2 text-[11px] leading-relaxed max-w-[90%] shadow-md shadow-emerald-500/20">
                  Summarize sales by region
                </div>
              </div>

              {/* AI response — typed animation */}
              <div className={`transition-all duration-700 ${typed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                <div className="bg-white rounded-2xl px-3 py-2.5 text-[11px] leading-relaxed border border-slate-100 shadow-sm space-y-2">
                  {/* Confidence badge */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-emerald-700">94</span>
                    </div>
                    <span className="text-[9px] font-semibold text-emerald-600">High Confidence</span>
                  </div>

                  <p className="text-slate-700 text-[11px]">
                    Here&apos;s your sales breakdown by region:
                  </p>

                  <div className="space-y-1 bg-slate-50 rounded-lg p-2">
                    {[
                      { region: 'West', amount: '$152,700', pct: 57 },
                      { region: 'East', amount: '$83,400', pct: 31 },
                      { region: 'North', amount: '$50,900', pct: 19 },
                    ].map((r) => (
                      <div key={r.region} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-8">{r.region}</span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-800 w-14 text-right">{r.amount}</span>
                      </div>
                    ))}
                  </div>

                  {/* Source link */}
                  <div className="flex items-center gap-1 text-emerald-600">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                    <span className="text-[9px] font-medium underline decoration-emerald-300">Rows 2-8 &bull; Sheet1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input area — matches actual InputArea.tsx */}
            <div className="flex-shrink-0 border-t border-slate-100 bg-white">
              {/* Input */}
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-1.5 bg-slate-50/80 rounded-xl p-1.5 border border-slate-100">
                  <input
                    type="text"
                    placeholder="Ask anything about your data..."
                    className="flex-1 text-[10px] text-slate-500 outline-none bg-transparent px-1.5 py-1"
                    readOnly
                  />
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <svg width="11" height="11" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.875L5.999 12zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Controls row — Mode toggle + Sheet selector */}
              <div className="px-2.5 pb-2 flex items-center gap-1.5">
                {/* Mode toggle */}
                <div className="flex gap-0.5 p-0.5 bg-slate-50 rounded-md border border-slate-100">
                  <div className="px-2 py-0.5 text-[9px] font-semibold rounded bg-white text-emerald-700 shadow-sm border border-slate-100">
                    Action
                  </div>
                  <div className="px-2 py-0.5 text-[9px] font-semibold rounded text-slate-400">
                    Chat
                  </div>
                </div>
                {/* Sheet selector */}
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <div className="w-4 h-4 rounded bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
                      <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h4v4H7V7zm0 6h4v4H7v-4zm6-6h4v4h-4V7zm0 6h4v4h-4v-4z" fill="currentColor"/>
                    </svg>
                  </div>
                  <span className="text-[9px] text-slate-600 font-medium truncate">Sheet1 (8)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sheet tabs — Google Sheets style */}
        <div className="bg-[#f8f9fa] border-t border-slate-200/60 px-3 py-1 flex items-center gap-1">
          <button className="w-5 h-5 rounded flex items-center justify-center text-[#5f6368] hover:bg-slate-200/60 transition-colors text-xs cursor-default">+</button>
          <div className="flex items-center gap-0.5 ml-1">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-t-md bg-white border border-b-0 border-slate-200 text-[11px] font-medium text-[#188038] shadow-sm">
              <GoogleSheetsLogo size={12} />
              Sheet1
            </div>
            <div className="px-3 py-1 text-[11px] text-[#5f6368] rounded-t-md hover:bg-slate-200/40 cursor-default">
              Sheet2
            </div>
            <div className="px-3 py-1 text-[11px] text-[#5f6368] rounded-t-md hover:bg-slate-200/40 cursor-default">
              Regional Summary
            </div>
          </div>
        </div>
      </div>

      {/* "Works inside Google Sheets" label */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <GoogleSheetsLogo size={16} />
        <span className="text-xs text-slate-400 font-medium">Works natively inside Google Sheets</span>
      </div>
    </div>
  )
}
