import { mount } from 'svelte'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'
import App from './App.svelte'

import '@soldy-ui/theme-oren'

useIcons(material)
useTheme(oren)

const target = document.getElementById('app')

if (target === null) {
	throw new Error('#app is missing from index.html')
}

mount(App, { target })
