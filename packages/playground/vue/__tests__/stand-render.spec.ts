/**
 * Браузерные спеки монтируют своим приложением Vue — `render` спеков
 * (`browser/render.ts`), стенд целиком — `renderStand` (`browser/stand.ts`),
 * — а не через `@vue/test-utils` (`render` из `vitest-browser-vue`).
 *
 * Та записывает каждый `emit` каждого приложения Vue на странице и стирает
 * записи только своего, да и то до его снятия. Превью стенда — отдельные
 * приложения хоста Vue: их события вместе с узлами ушедших страниц жили до
 * конца файла, и рендерер браузерного прогона в CI падал от памяти
 * (`VITEST_BROWSER_CONNECTION_CLOSED`); к концу `calendar.spec.ts` копилось
 * 200 МБ живой кучи. Поэтому оболочку `App.vue` импортирует только
 * `browser/stand.ts`, а `@vue/test-utils` и `vitest-browser-vue` — никто.
 */

import { describe, it, expect } from 'vitest'

const sources = import.meta.glob<string>('../browser/**/*.ts', {
	query: '?raw',
	import: 'default',
	eager: true,
})

/** Файлы браузерных спеков, чей исходник подходит под образец. */
const importersOf = (pattern: RegExp) =>
	Object.entries(sources)
		.filter(([, source]) => pattern.test(source))
		.map(([path]) => path)

describe('монтирование в браузерных спеках', () => {
	it('оболочку импортирует только renderStand', () => {
		expect(importersOf(/from '\.\.\/src\/App\.vue'/)).toEqual(['../browser/stand.ts'])
	})

	it('@vue/test-utils и vitest-browser-vue не импортирует никто', () => {
		expect(importersOf(/from '(@vue\/test-utils|vitest-browser-vue)'/)).toEqual([])
	})
})
