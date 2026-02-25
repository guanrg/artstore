import { useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"

function isProductDetailsRoute() {
  return /^\/app\/products\/[^/]+\/?$/.test(window.location.pathname)
}

function findProductHeader() {
  const headers = Array.from(
    document.querySelectorAll<HTMLDivElement>("div.flex.items-center.justify-between.px-6.py-4")
  )
  return headers.find((header) => {
    const hasHeading = Boolean(header.querySelector("h1,h2,h3,h4"))
    const hasButton = Boolean(header.querySelector("button"))
    return hasHeading && hasButton
  })
}

function upsertActionButtons() {
  if (!isProductDetailsRoute()) {
    return
  }

  const header = findProductHeader()
  if (!header) {
    return
  }

  const actionGroup = header.lastElementChild as HTMLElement | null
  if (!actionGroup) {
    return
  }

  const menuTrigger = actionGroup.querySelector<HTMLButtonElement>("button")
  if (!menuTrigger) {
    return
  }

  menuTrigger.style.display = "none"

  let host = actionGroup.querySelector<HTMLDivElement>('[data-ux-action-host="true"]')
  if (!host) {
    host = document.createElement("div")
    host.setAttribute("data-ux-action-host", "true")
    host.style.display = "flex"
    host.style.gap = "8px"
    actionGroup.appendChild(host)
  }

  if (host.childElementCount > 0) {
    return
  }

  const clickDeleteFromMenu = async () => {
    menuTrigger.click()
    await new Promise((resolve) => setTimeout(resolve, 40))
    const menuItems = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const visible = menuItems.filter((item) => item.offsetParent !== null)
    const target = visible[visible.length - 1]
    target?.click()
  }

  const makeButton = (label: string, variant: "primary" | "danger", onClick: () => void) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.textContent = label
    btn.onclick = onClick
    btn.style.borderRadius = "8px"
    btn.style.border = variant === "danger" ? "1px solid #f1b4b4" : "1px solid #d0d5dd"
    btn.style.background = variant === "danger" ? "#fff5f5" : "#ffffff"
    btn.style.color = variant === "danger" ? "#b42318" : "#111827"
    btn.style.padding = "6px 12px"
    btn.style.fontSize = "13px"
    btn.style.fontWeight = "600"
    btn.style.cursor = "pointer"
    return btn
  }

  host.appendChild(
    makeButton("Edit", "primary", () => {
      const base = window.location.pathname.replace(/\/$/, "")
      window.location.assign(`${base}/edit`)
    })
  )
  host.appendChild(makeButton("Delete", "danger", () => void clickDeleteFromMenu()))
}

function patchDialogs() {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
  dialogs.forEach((dialog) => {
    const className = dialog.className || ""
    const isRouteDrawer = className.includes("sm:max-w-[560px]") || className.includes("slide-in-from-right-1/2")
    const hasDescription = Boolean(dialog.querySelector("textarea"))

    if (!isRouteDrawer && !hasDescription) {
      return
    }

    dialog.style.position = "fixed"
    dialog.style.left = "50%"
    dialog.style.top = "50%"
    dialog.style.right = "auto"
    dialog.style.transform = "translate(-50%, -50%)"
    dialog.style.width = "min(92vw, 1100px)"
    dialog.style.maxHeight = "88vh"
    dialog.style.overflow = "auto"
    dialog.style.borderRadius = "14px"
    dialog.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.18)"
    dialog.style.zIndex = "1001"

    const textarea = dialog.querySelector<HTMLTextAreaElement>("textarea")
    if (textarea) {
      textarea.rows = Math.max(textarea.rows || 0, 50)
      textarea.style.minHeight = "720px"
    }
  })
}

const ProductActionsUxWidget = () => {
  useEffect(() => {
    const run = () => {
      upsertActionButtons()
      patchDialogs()
    }

    run()
    const observer = new MutationObserver(() => run())
    observer.observe(document.body, { subtree: true, childList: true, attributes: true })

    return () => observer.disconnect()
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductActionsUxWidget
