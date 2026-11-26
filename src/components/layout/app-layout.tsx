import { Outlet } from 'react-router-dom'
import { AppFooter } from './app-footer'

/**
 * Page, then footer. The page area fills at least the rest of the screen, so the
 * footer sits at the bottom even when a page is short.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col [--app-footer-height:3.5rem]">
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <AppFooter />
    </div>
  )
}
