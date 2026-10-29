import { createApp } from 'vue'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'
import App from './App.vue'

import '@soldy-ui/theme-oren'

useIcons(material)
useTheme(oren)

createApp(App).mount('#app')
