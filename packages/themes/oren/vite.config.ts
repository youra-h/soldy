import { defineConfig } from 'vite'
import path from 'node:path'

/**
 * Сборка стилей темы: SCSS-исходники компилируются в единый dist/index.css.
 *
 * Вход — сам `src/index.scss`, и режима библиотеки (`build.lib`) нет: у входа
 * из одних стилей пустой JS-чанк Vite выбрасывает сам, и в `dist` ложится один
 * `index.css`. Режим библиотеки требует JS-вход — со `.scss` он падает в
 * `vite:css-post`, — и пустой чанк такого входа уезжал в пакет файлом
 * `theme-oren.js`, на который не ведёт ни одна точка входа. Сторож —
 * `__tests__/package-build.spec.ts`.
 *
 * В SCSS-вход инжектируется @import base.css (tailwind + токены + утилиты),
 * чтобы @apply в компонентных стилях корректно развернулся через
 * @tailwindcss/postcss.
 */
export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: path.resolve(import.meta.dirname, 'src/index.scss'),
			output: {
				assetFileNames: 'index.css',
			},
		},
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: (content: string) => {
					const importLine = `@import "${path.resolve(import.meta.dirname, 'src/base.css')}";\n`
					const matches = [...content.matchAll(/^@use\s+[^;]+;\s*\n/gm)]

					if (matches.length > 0) {
						const last = matches[matches.length - 1]
						const end = (last.index ?? 0) + last[0].length
						return content.slice(0, end) + importLine + content.slice(end)
					}

					return importLine + content
				},
			},
		},
	},
})
