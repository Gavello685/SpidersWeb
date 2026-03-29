const STORAGE_KEY = "spidersweb-license"

interface LicenseRecord {
  key: string
  valid: boolean
}

export const LicenseStorage = {
  get(): LicenseRecord | null {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  set(record: LicenseRecord): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  },

  isPremium(): boolean {
    return this.get()?.valid === true
  },
}
