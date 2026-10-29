'use client'

import type { ReactNode } from 'react'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

// The registries are global: filled once, on the server and in the browser,
// before the components under the providers render
useIcons(material)
useTheme(oren)

export function Providers({ children }: { children: ReactNode }) {
	return children
}
