import { Outlet } from 'react-router-dom'
import PDAHeader from './PDAHeader'
import PDAFooter from './PDAFooter'

export default function PDALayout() {
  return (
    <div className="min-h-screen flex flex-col bg-pda-bg">
      {/* CRT Effects */}
      <div className="fixed inset-0 scanlines pointer-events-none z-50" />
      <div className="fixed inset-0 crt-overlay pointer-events-none z-40" />
      
      {/* PDA Case */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full bg-pda-case shadow-case-inset">
        {/* Header */}
        <PDAHeader />
        
        {/* Screen Content */}
        <main className="flex-1 bg-pda-screen-bg shadow-crt overflow-y-auto no-scrollbar">
          <Outlet />
        </main>
        
        {/* Footer Navigation */}
        <PDAFooter />
      </div>
    </div>
  )
}
