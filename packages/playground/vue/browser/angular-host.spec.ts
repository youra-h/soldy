/**
 * Хост Angular на странице стенда в настоящем браузере.
 *
 * jsdom проверяет хост целиком, но пакеты Angular идут там через
 * преобразование Vite (`server.deps.inline`), а в браузере — через его
 * предсборку зависимостей. Линкер стоит и в ней (`src/vite-angular.ts`): без
 * него страница Angular упала бы на первом же импорте пакета Angular, требуя
 * компилятор в рантайме.
 *
 * Здесь же — раскладка, которой jsdom не считает. Корень хоста
 * (`pg-angular-root`) в раскладке не участвует (`display: contents`), и
 * компонент стоит в ячейке так же, как компонент хоста Vue, — то же место и
 * тот же размер.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from '../src/App.vue'
import { router } from '../src/router'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

setIcons(material)
useTheme(oren)

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** Строка страницы по имени пропа. */
const propRow = (name: string): HTMLElement => {
	const found = [...document.querySelectorAll('.pg-prop')].find(
		(node) => node.querySelector('.pg-prop__name')?.textContent?.trim() === name,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`строки «${name}» нет`)

	return found
}

/**
 * Рамка компонента первой колонки строки — от угла сцены колонки: по ней
 * видно и место компонента в ячейке, и его размер.
 */
async function boxOf(framework: string, component: string, selector: string) {
	await router.push(`/${framework}/${component}`)
	await settle()

	const stage = propRow('visible').querySelector('.pg-col__stage')
	const root = stage?.querySelector(selector)

	if (!stage || !root) throw new Error(`${framework}/${component}: в сцене нет ${selector}`)

	const outer = stage.getBoundingClientRect()
	const inner = root.getBoundingClientRect()

	return {
		x: Math.round(inner.left - outer.left),
		y: Math.round(inner.top - outer.top),
		width: Math.round(inner.width),
		height: Math.round(inner.height),
	}
}

beforeEach(async () => {
	// Колонки пишут события компонентов в консоль — в отчёте прогона это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})
	document.documentElement.dataset.theme = 'oren'

	await router.push('/vue')

	render(App, { global: { plugins: [router] } })

	await settle()
})

describe('хост Angular', () => {
	it.each([
		['button', '.s-button'],
		['icon', '.s-icon'],
		['skeleton', '.s-skeleton'],
	])('%s стоит в ячейке так же, как у Vue', async (component, selector) => {
		const vue = await boxOf('vue', component, selector)
		const angular = await boxOf('angular', component, selector)

		expect(angular.width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})
