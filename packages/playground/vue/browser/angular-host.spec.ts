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
 * тот же размер. У превью с обёрткой и содержимым так же стоят и обёртка, и
 * части: подпись вокруг флажка, элементы коллекций, панель активного таба, —
 * а у таблицы её окно, корень, заголовки и строки: ширину колонок плагин
 * раскладки мерит по окну, и раскладка совпадает, только если окно он нашёл.
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
 * Рамки компонента и его нарисованных частей в первой колонке строки — от угла
 * сцены колонки, в порядке документа: по ним видно и место каждой части в
 * ячейке, и её размер. Скрытая часть рамок не имеет и не считается: панель
 * неактивного таба Angular держит в разметке скрытой — это элемент
 * потребителя, — а Vue её не рисует.
 */
async function boxesOf(framework: string, component: string, selector: string) {
	await router.push(`/${framework}/${component}`)
	await settle()

	const stage = propRow('visible').querySelector('.pg-col__stage')
	const parts = [...(stage?.querySelectorAll(selector) ?? [])].filter(
		(part) => part.getClientRects().length > 0,
	)

	if (!stage || parts.length === 0) {
		throw new Error(`${framework}/${component}: в сцене нет ${selector}`)
	}

	const outer = stage.getBoundingClientRect()

	return parts.map((part) => {
		const inner = part.getBoundingClientRect()

		return {
			x: Math.round(inner.left - outer.left),
			y: Math.round(inner.top - outer.top),
			width: Math.round(inner.width),
			height: Math.round(inner.height),
		}
	})
}

beforeEach(async () => {
	// Колонки пишут события компонентов в консоль — в отчёте прогона это шум
	vi.spyOn(console, 'log').mockImplementation(() => {})
	document.documentElement.dataset.soTheme = 'oren'

	await router.push('/vue')

	render(App, { global: { plugins: [router] } })

	await settle()
})

describe('хост Angular', () => {
	// Селектор — компонент и его части: обёртка, элементы коллекций, панели
	it.each([
		['button', '.so-button'],
		['icon', '.so-icon'],
		['skeleton', '.so-skeleton'],
		['input', '.so-input'],
		['check-box', '.so-label, .so-check-box'],
		['switch', '.so-label, .so-switch'],
		['label', '.so-label, .so-check-box'],
		['radio-group', '.so-radio-group, .so-radio-group-item'],
		['list-box', '.so-list-box, .so-list-box-item'],
		['tabs', '.so-tabs, .so-tabs-item, .so-tabs__panel'],
		['accordion', '.so-accordion, .so-accordion-item'],
		// Таблица — окно, корень, заголовки и строки: рамку превью задаёт хост.
		// Окна Virtual здесь нет — у Vue в его ряду ещё и Select, которого у
		// Angular нет
		['table', '.so-table__viewport, .so-table, .so-table-column, .so-table-row'],
	])('%s стоит в ячейке так же, как у Vue', async (component, selector) => {
		const vue = await boxesOf('vue', component, selector)
		const angular = await boxesOf('angular', component, selector)

		expect(angular[0].width).toBeGreaterThan(0)
		expect(angular).toEqual(vue)
	})
})
