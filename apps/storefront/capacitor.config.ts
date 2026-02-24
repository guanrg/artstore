import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.dev026.storefront",
  appName: "Storefront",
  webDir: "public",
  server: {
    url: process.env.CAPACITOR_WEB_URL || "http://10.0.2.2:3000",
    cleartext: true,
  },
}

export default config
