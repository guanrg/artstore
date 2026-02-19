"use client"

const CART_UPDATED_EVENT = "cart-updated"

export function emitCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}

export function onCartUpdated(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  window.addEventListener(CART_UPDATED_EVENT, callback)
  return () => window.removeEventListener(CART_UPDATED_EVENT, callback)
}
