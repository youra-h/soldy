import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'
import { App } from './App.tsx'

import '@soldy-ui/theme-oren'

useIcons(material)
useTheme(oren)

const root = document.getElementById('root')

if (root === null) {
	throw new Error('#root is missing from index.html')
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
