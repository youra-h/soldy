import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@soldy/accessor': path.resolve(__dirname, '../../accessor'),
			'@soldy/core': path.resolve(__dirname, '../../core/src'),
			'@soldy/icons-material': path.resolve(__dirname, '../../icons/material/src'),
			'@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(__dirname, '../../setup'),
			'@soldy/ui-react': path.resolve(__dirname, 'src/index.ts'),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['__tests__/**/*.spec.tsx'],
	},
})
