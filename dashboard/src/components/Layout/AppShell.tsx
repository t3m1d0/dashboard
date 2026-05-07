// ============================================================
// AppShell — Main layout wrapper
// ============================================================
import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useDashboardStore } from '@/store'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarOpen, setSidebarOpen } = useDashboardStore()

  // Close sidebar on small screens on mount
  useEffect(() => {
    if (window.innerWidth <= 900) setSidebarOpen(false)
  }, [])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-[100] flex flex-col transition-transform duration-300"
        style={{
          width: 'var(--sidebar-width)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[99] lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className="flex flex-col flex-1 min-h-screen transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? 'var(--sidebar-width)' : '0',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Topbar />
        <div className="flex-1 p-6" style={{ color: 'var(--text-primary)', minHeight: 0 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
