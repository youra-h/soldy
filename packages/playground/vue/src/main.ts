import { createApp } from 'vue'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from './App.vue'
import { router } from './router'
import { DEFAULT_ROUTE } from './navigation'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import './styles.css'

// Пакет иконок и поведение темы — общие на страницу: их видят и оболочка, и
// хосты превью всех фреймворков
setIcons(material)
useTheme(oren)

// Прямая ссылка сильнее умолчания: перезагрузка страницы компонента должна
// оставлять на ней, а не выкидывать на витрину
if (!window.location.hash) window.location.hash = DEFAULT_ROUTE

createApp(App).use(router).mount('#app')
