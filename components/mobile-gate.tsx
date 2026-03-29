"use client"

import { useEffect, useState } from "react"
import { Monitor } from "lucide-react"

const MOBILE_BREAKPOINT = 768

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    setChecked(true)
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Avoid flash: render nothing until we know screen size
  if (!checked) return null

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background px-8 text-center">
        <Monitor className="w-14 h-14 text-muted-foreground mb-6" />
        <h1 className="text-2xl font-bold mb-3">Built for Desktop</h1>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm mb-4">
          The Spider's Web is a complex, canvas-based mapping tool designed for desktop use.
          It hasn't been optimised for mobile yet — some features may be partially or fully non-functional on a small screen.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          For the best experience, visit on a laptop or desktop computer.
          Mobile support is on the roadmap and will improve in a future update.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
