"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState(() => searchParams.get("token") ?? "")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setMessage("")
    setError("")

    const res = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        confirm_password: confirmPassword,
      }),
    })
    const json = (await res.json()) as { message?: string }

    if (!res.ok) {
      setError(json.message ?? "Failed to reset password.")
      setPending(false)
      return
    }

    setMessage("Password has been reset. You can now log in with your new password.")
    setPending(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 p-8">
      <div className="mx-auto max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-100">Reset password</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Paste your reset token and set a new password.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Reset token</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-md border border-zinc-600 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-600 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-600 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {pending ? "Updating..." : "Reset password"}
          </button>
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>
        <p className="mt-4 text-sm text-zinc-400">
          Back to{" "}
          <Link href="/account/login" className="font-medium text-orange-700">
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}
