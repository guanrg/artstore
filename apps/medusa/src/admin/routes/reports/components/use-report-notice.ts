import { useEffect, useRef, useState } from "react"

export type ReportNotice = {
  tone: "info" | "success" | "error"
  message: string
}

export function useReportNotice(defaultDuration = 1800) {
  const [notice, setNotice] = useState<ReportNotice | null>(null)
  const timerRef = useRef<number | null>(null)

  const clearNotice = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setNotice(null)
  }

  const showNotice = (
    message: string,
    tone: ReportNotice["tone"] = "info",
    duration = defaultDuration
  ) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    setNotice({ message, tone })
    timerRef.current = window.setTimeout(() => {
      setNotice(null)
      timerRef.current = null
    }, duration)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return {
    notice,
    clearNotice,
    showNotice,
  }
}
