/**
 * @see https://theme-plume.vuejs.press/config/navigation/ 查看文档了解配置详情
 *
 * Navbar 配置文件，它在 `.vuepress/plume.config.ts` 中被导入。
 */

import { defineNavbarConfig } from 'vuepress-theme-plume'

export default defineNavbarConfig([
  { text: '首页', link: '/' },
  { text: '快速开始', link: "/intro/README.md" },
  { text: '常见问题', link: '/intro/QA.md' },
  { text: '源制作指南', link: '/intro/create_source.md' },
  { text: '键盘快捷键', link: '/intro/keyboard.md' },
  { text: '源链接加解密', link: '/intro/url.md' },
])
