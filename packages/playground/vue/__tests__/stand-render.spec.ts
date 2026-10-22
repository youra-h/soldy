/**
 * Стенд целиком браузерные спеки монтируют через `renderStand`
 * (`browser/stand.ts`), а не сами — `render` из `vitest-browser-vue`.
 *
 * Тот монтирует через `@vue/test-utils`, а она записывает каждый `emit`
 * каждого приложения Vue на странице и стирает записи только своего. Превью
 * стенда — отдельные приложения хоста Vue: их события вместе с узлами ушедших
 * страниц жили до конца файла, и рендерер браузерного прогона в CI падал от
 * памяти (`VITEST_BROWSER_CONNECTION_CLOSED`). Поэтому оболочку `App.vue`
 * импортирует только `browser/stand.ts`.
 */

import { describe, it, expect } from 'vitest'

const sources = import.meta.glob<string>('../browser/**/*.ts', {
	query: '?raw',
	import: 'default',
	eager: true,
})

describe('стенд в браузерных спеках', () => {
	it('оболочку импортирует только renderStand', () => {
		const importers = Object.entries(sources)
			.filter(([, source]) => /from '\.\.\/src\/App\.vue'/.test(source))
			.map(([path]) => path)

		expect(importers).toEqual(['../browser/stand.ts'])
	})
})
