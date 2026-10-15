import { defineConfig } from 'vitest/config'
import { aliases, plugins } from './vite.base.ts'

/**
 * Тесты стенда — дымовые: он существует ради того, чтобы дёргать компоненты, и
 * молча сломавшаяся страница обесценивает его целиком. Тему сюда не тянем: она
 * отдаёт CSS, а в jsdom стилей всё равно нет — то, что нужно проверять по
 * раскладке, живёт в `vitest.browser.config.ts`.
 */
export default defineConfig({
	plugins: plugins(),
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
				// Пакеты Angular — через Vite, а не мимо него, как прочие
				// зависимости: они выпущены в частичной форме, и до полной их
				// доводит линкер в плагине Angular (`src/vite-angular.ts`). Мимо
				// него первый же импорт потребовал бы компилятор Angular в рантайме
				inline: [/[\\/]node_modules[\\/]@angular[\\/]/],
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
