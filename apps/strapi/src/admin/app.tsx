import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    translations: {
      en: {
        'Auth.form.welcome.title': '内容管理',
      },
      'zh-Hans': {
        'Auth.form.welcome.title': '内容管理',
      },
      zh: {
        'Auth.form.welcome.title': '内容管理',
      },
    },
  },
  bootstrap(app: StrapiApp) {
    void app;
  },
};
