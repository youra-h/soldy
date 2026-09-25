import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(__dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(__dirname, '../../icons/material/src'),
			'@soldy-ui/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(__dirname, '../../setup/index.ts'),
			'@soldy-ui/react': path.resolve(__dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./__tests__/setup.ts'],
		include: ['__tests__/**/*.spec.tsx'],
	},
})
