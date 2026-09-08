import { createApp } from 'vue'
import { setIcons } from '@soldy/setup'
import * as material from '@soldy/icons-material'
import App from './App.vue'
import { router, DEFAULT_ROUTE } from './router'

import '@soldy/theme-oren'
import './styles.css'

setIcons(material)

// Прямая ссылка сильнее умолчания: перезагрузка страницы компонента должна
// оставлять на ней, а не выкидывать на витрину
if (!window.location.hash) window.location.hash = DEFAULT_ROUTE

createApp(App).use(router).mount('#app')
