import type { ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'

/**
 * Mantine as its docs set an application up: the provider at the root and the
 * styles of the packages in use — `@mantine/core` and `@mantine/dates`.
 */
export function Root({ children }: { children?: ReactNode }) {
	return <MantineProvider>{children}</MantineProvider>
}
