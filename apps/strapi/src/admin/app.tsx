import type { StrapiApp } from "@strapi/strapi/admin"

export default {
  config: {
    translations: {
      en: {
        "Auth.form.welcome.title": "内容管理",
      },
      "zh-Hans": {
        "Auth.form.welcome.title": "内容管理",
      },
      zh: {
        "Auth.form.welcome.title": "内容管理",
      },
    },
  },
  bootstrap(app: StrapiApp) {
    void app
    const id = "strapi-admin-gray-theme"
    if (document.getElementById(id)) {
      return
    }

    const style = document.createElement("style")
    style.id = id
    style.textContent = `
      body, #strapi {
        background: #eef0f2 !important;
      }
      .strapi-app, main {
        background: #eef0f2 !important;
      }
      [class*="Card"], [class*="Box"], [class*="Layout"] {
        background-color: #f4f5f6 !important;
      }
    `
    document.head.appendChild(style)
  },
}
