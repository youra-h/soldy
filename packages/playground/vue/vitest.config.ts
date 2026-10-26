import { defineConfig } from 'vitest/config'
import { aliases, constants, plugins } from './vite.base.ts'

/**
 * Тесты стенда — дымовые: он существует ради того, чтобы дёргать компоненты, и
 * молча сломавшаяся страница обесценивает его целиком. Тему сюда не тянем: она
 * отдаёт CSS, а в jsdom стилей всё равно нет — то, что нужно проверять по
 * раскладке, живёт в `vitest.browser.config.ts`.
 */
export default defineConfig({
	plugins: plugins(),
	define: constants(),
	test: {
		environment: 'jsdom',
		environmentOptions: {
			jsdom: { pretendToBeVisual: true },
		},
		setupFiles: ['./__tests__/setup.ts'],
		// Явный список, а не умолчание: рядом лежит браузерный прогон
		// (`browser/`), и в jsdom его тестам делать нечего — там нет раскладки,
		// ради которой они написаны.
		include: ['__tests__/**/*.spec.ts'],
		// Лимит сторожит зависание, а не скорость. Тесты монтируют стенд
		// целиком — компонент всеми пропами в две колонки, — и первый тест
		// файла платит ещё и за первую загрузку модулей страницы. В CI такой
		// тест (`language.spec.ts`, календарь хоста Vue) шёл 6,9 с при 1,8 с
		// локально и падал на умолчании Vitest в 5 с.
		testTimeout: 15_000,
		server: {
			deps: {
				// Angular packages go through Vite, not past it like the other
				// dependencies: they are published in partial form, and the linker
				// of the Angular plugin (`src/vite-angular.ts`) brings them to full
				// form. Past it, the very first import would ask for the Angular
				// compiler at runtime. The compiler CLI is no such package: it is
				// the build tool the plugin imports, and the plugin's spec
				// (`__tests__/vite-angular.spec.ts`) gets it from Node as is.
				// Through Vite, its bundles and the Angular compiler went through
				// the linker: seconds of a cold run and warnings on source maps
				inline: [/[\\/]node_modules[\\/]@angular[\\/](?!compiler-cli[\\/])/],
			},
		},
	},
	resolve: {
		// Сборки фреймворков — браузерные, как в стенде: без условия `browser`
		// `svelte` в jsdom разрешается в серверную сборку, где `mount` нет, и
		// хост Svelte не смонтировал бы ни одного превью
		conditions: ['browser'],
		alias: aliases({ themeCss: false }),
	},
})
