"use client"

import Link from "next/link"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)
    setMessage("")
    setError("")

    const res = await fetch("/api/auth/password/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const json = (await res.json()) as { message?: string }

    if (!res.ok) {
      setError(json.message ?? "Failed to request password reset.")
      setPending(false)
      return
    }

    setMessage(json.message ?? "If this email exists, a reset link will be sent.")
    setPending(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-800 p-8">
      <div className="mx-auto max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-100">Forgot password</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Enter your account email and we will send reset instructions.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full rounded-md border border-zinc-600 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {pending ? "Submitting..." : "Send reset link"}
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
