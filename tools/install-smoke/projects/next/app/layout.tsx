import type { Metadata } from 'next'
import { Providers } from './providers'

import '@soldy-ui/theme-oren'

export const metadata: Metadata = {
	title: 'Soldy UI — Next.js',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="en">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
