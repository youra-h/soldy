/**
 * Меню страницы тестов: две колонки — темы и компоненты темы.
 *
 * Тест браузерный: раскладка считается только в настоящем браузере. Первая
 * версия задала колонкам 130 и 170px, а у `.s-list-box` в теме `min-w-40`
 * (160px) — список тем вылезал из своей колонки и наезжал на соседний.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-vue'
import { router } from '../src/router'
import { SCENARIOS, testsPath } from '../src/catalog'
import TestsSidebar from '../src/components/TestsSidebar.vue'

import '@soldy-ui/theme-oren'
import '../src/styles.css'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

describe('меню страницы тестов', () => {
	it('каждый список лежит в своей колонке, колонки не наезжают друг на друга', async () => {
		await router.push(testsPath(SCENARIOS) ?? '/tests')
		await router.isReady()

		render(TestsSidebar, { global: { plugins: [router] } })
		await nextFrame()

		const columns = [...document.querySelectorAll('.pg__sidebar-column')]

		expect(columns).toHaveLength(2)

		const boxes = columns.map((column) => {
			const list = column.querySelector('.pg__menu')

			if (!list) throw new Error('в колонке нет меню')

			return { column: column.getBoundingClientRect(), list: list.getBoundingClientRect() }
		})

		for (const { column, list } of boxes) {
			expect(list.left).toBeGreaterThanOrEqual(column.left)
			expect(list.right).toBeLessThanOrEqual(column.right)
		}

		expect(boxes[0].column.right).toBeLessThanOrEqual(boxes[1].column.left)
	})
})
