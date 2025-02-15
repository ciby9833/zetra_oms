import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createI18n } from 'vue-i18n'
import zhLocale from './locales/zh.json'
import enLocale from './locales/en.json'
import idLocale from './locales/id.json'
import { permission } from './directives/permission'

import App from './App.vue'
import router from './router'

import './assets/main.css'

// 配置 i18n 实例
const i18n = createI18n({
  // 使用 compositionAPI 模式，这样可以在 setup 中使用 useI18n
  legacy: false,
  locale: 'en',         // 默认语言
  fallbackLocale: 'en', // 回退语言
  messages: {
    zh: zhLocale,
    en: enLocale,
    id: idLocale
  }
})

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(i18n)
app.directive('permission', permission)

app.mount('#app')
