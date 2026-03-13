type PatchNativePageLayoutInput = {
  routePattern: RegExp
  bodyRoute: string
  heroTitleKeywords: string[]
  heroShellAttr: string
  actionHostKey: string
  filterShellAttr?: string
}

export function syncAdminRouteBody(routePattern: RegExp, bodyRoute: string) {
  if (routePattern.test(window.location.pathname)) {
    document.body.dataset.adminRoute = bodyRoute
    return
  }

  if (document.body.dataset.adminRoute === bodyRoute) {
    delete document.body.dataset.adminRoute
  }
}

function getMainCandidates() {
  return Array.from(
    document.querySelectorAll<HTMLElement>("main > div, [data-radix-scroll-area-viewport] > div > div")
  )
}

function getNodeDepth(node: HTMLElement, root: HTMLElement) {
  let depth = 0
  let current = node.parentElement
  while (current && current !== root) {
    depth += 1
    current = current.parentElement
  }
  return depth
}

function findActionGroup(root: HTMLElement) {
  const groups = Array.from(root.querySelectorAll<HTMLElement>("div, header, section"))
    .map((node) => ({
      node,
      buttons: node.querySelectorAll("button, a[href]").length,
      depth: getNodeDepth(node, root),
    }))
    .filter((entry) => entry.buttons >= 1)
    .sort((left, right) => {
      if (left.depth !== right.depth) {
        return left.depth - right.depth
      }
      return right.buttons - left.buttons
    })

  return groups[0]?.node ?? null
}

export function patchNativePageLayout({
  routePattern,
  bodyRoute,
  heroTitleKeywords,
  heroShellAttr,
  actionHostKey,
  filterShellAttr,
}: PatchNativePageLayoutInput) {
  if (!routePattern.test(window.location.pathname)) {
    delete document.body.dataset.adminRoute
    return
  }

  document.body.dataset.adminRoute = bodyRoute

  const candidates = getMainCandidates()
  const hero = candidates.find((node) => {
    const text = (node.textContent || "").toLowerCase()
    return heroTitleKeywords.some((keyword) => text.includes(keyword.toLowerCase()))
  })

  if (hero && !hero.dataset[heroShellAttr]) {
    hero.dataset[heroShellAttr] = "true"
  }

  // Keep native action groups in place for now.
  // Moving Medusa's internal action bars proved too fragile across pages.
  void actionHostKey
  void findActionGroup

  if (filterShellAttr) {
    const filterPanel = candidates.find((node) => {
      const inputs = node.querySelectorAll("input, select")
      const buttons = node.querySelectorAll("button")
      return inputs.length >= 1 && buttons.length >= 1
    })

    if (filterPanel && !filterPanel.dataset[filterShellAttr]) {
      filterPanel.dataset[filterShellAttr] = "true"
    }
  }
}
