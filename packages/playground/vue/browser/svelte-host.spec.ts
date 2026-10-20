/**
 * Хост Svelte на странице стенда в настоящем браузере — раскладка, которой
 * jsdom не считает.
 *
 * Разметка Svelte написана по разметке Vue, и тема у них одна, но разойтись
 * они могут молча: пробел между соседними узлами Svelte оставляет текстом, а
 * Vue его вырезает, и вне флекса и сетки такой пробел сдвинул бы части.
 * Поэтому компонент Svelte стоит в ячейке так же, как компонент хоста Vue, —
 * то же место и тот же размер. У превью с обёрткой и содержимым так же стоят
 * и обёртка, и части: подпись вокруг контрола, элементы коллекций, панель
 * активного таба, ручки и заливка ползунка, звёзды оценки, кнопки и вьюпорт
 * ленты, страницы и стрелки пагинации, — а у таблицы её окно, корень,
 * заголовки и строки. Окна Virtual здесь нет — у Vue в его ряду ещё и Select,
 * которого у Svelte нет.
 *
 * Оверлеи — дважды. В ячейке — то, что стоит на месте: корень поповера и
 * подсказки с триггером, кнопки окна, выезжающей панели и тостов. И открытые:
 * панель поповера, окно и выезжающая панель с подложкой и частями, регион с
 * тостом — телепортированы в `body`, мимо сцены, и их рамки сверяются от угла
 * окна, когда доиграли переходы темы. Пробелы Svelte внутри панелей jsdom не
 * видит: раскладку считает только браузер.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from '../src/App.vue'
import { router } from '../src/router'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

useIcons(material)
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
 * ячейке, и её размер.
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

/**
 * Рамки открытого оверлея и его частей — от угла окна, в порядке документа:
 * панель телепортирована в `body`, мимо сцены, и стоит у триггера или у края
 * окна. Открывает её кнопка с текстом `opener` в первой колонке строки
 * `visible`; рамки снимаются, когда доиграли переходы темы — проявление,
 * въезд, место у якоря.
 */
async function openedBoxesOf(
	framework: string,
	component: string,
	opener: string,
	selector: string,
) {
	await router.push(`/${framework}/${component}`)
	await settle()

	const stage = propRow('visible').querySelector('.pg-col__stage')
	const button = [...(stage?.querySelectorAll('.so-button') ?? [])].find(
		(candidate) => candidate.textContent?.trim() === opener,
	)

	if (!(button instanceof HTMLElement)) {
		throw new Error(`${framework}/${component}: в сцене нет кнопки «${opener}»`)
	}

	button.click()
	await settle()
	await Promise.all(document.getAnimations().map((animation) => animation.finished))

	const parts = [...document.querySelectorAll(selector)].filter(
		(part) => part.getClientRects().length > 0,
	)

	if (parts.length === 0) throw new Error(`${framework}/${component}: открытого ${selector} нет`)

	return parts.map((part) => {
		const box = part.getBoundingClientRect()

		return {
			x: Math.round(box.left),
			y: Math.round(box.top),
			width: Math.round(box.width),
			height: Math.round(box.height),
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

describe('хост Svelte', () => {
	// Селектор — компонент и его части: обёртка, элементы коллекций, панели,
	// нарисованные части разметки
	it.each([
		['button', '.so-button'],
		['icon', '.so-icon'],
		['skeleton', '.so-skeleton'],
		['input', '.so-input'],
		['check-box', '.so-label, .so-check-box'],
		['switch', '.so-label, .so-switch'],
		['label', '.so-label, .so-check-box'],
		['field', '.so-field, .so-field__label, .so-field__control, .so-input, .so-field__helper'],
		['radio-group', '.so-radio-group, .so-radio-group-item'],
		['list-box', '.so-list-box, .so-list-box-item'],
		['tabs', '.so-tabs, .so-tabs-item, .so-tabs__panel'],
		['accordion', '.so-accordion, .so-accordion-item'],
		['table', '.so-table__viewport, .so-table, .so-table-column, .so-table-row'],
		['progress-spinner', '.so-progress-spinner'],
		['progress-linear', '.so-progress-linear, .so-progress-linear__range'],
		[
			'slider',
			'.so-label, .so-slider, .so-slider__track, .so-slider__range, .so-slider__thumb',
		],
		[
			'rating',
			'.so-label, .so-rating, .so-rating__star, .so-rating__star-fill, .so-rating svg',
		],
		[
			'scroller',
			'.so-scroller, .so-scroller__prev, .so-scroller__viewport, .so-scroller__next, .so-scroller svg',
		],
		[
			'pagination',
			'.so-pagination, .so-pagination__prev, .so-pagination-item, .so-pagination__ellipsis, .so-pagination__next, .so-pagination svg',
		],
		// Оверлеи в ячейке: корень с триггером, кнопки, которые открывают окно,
		// панель и тосты, — панели и регион телепортированы мимо сцены
		['popover', '.so-popover, .so-popover .so-button'],
		['tooltip', '.so-tooltip, .so-tooltip .so-button'],
		['dialog', '.so-button'],
		['drawer', '.so-button'],
		['toasts', '.so-button'],
	])('%s стоит в ячейке так же, как у Vue', async (component, selector) => {
		const vue = await boxesOf('vue', component, selector)
		const svelte = await boxesOf('svelte', component, selector)

		expect(svelte[0].width).toBeGreaterThan(0)
		expect(svelte).toEqual(vue)
	})

	// Кнопка, которая открывает оверлей, его части и их число: панель,
	// подложка, заголовок, тело, подвал, крестик и содержимое; у тостов —
	// регион с тостом (пустые регионы других колонок стоят у того же края),
	// тост, плашка, значок, текст, кнопка «Отменить» и крестик. Число частей —
	// чтобы неоткрывшийся оверлей не сошёлся сам с собой
	it.each([
		[
			'popover',
			'Открыть',
			'.so-popover__panel, .so-popover__content, .so-popover__content > *, .so-popover__close',
			5,
		],
		[
			'dialog',
			'Открыть окно',
			'.so-dialog__backdrop, .so-dialog, .so-dialog__title, .so-dialog__body, .so-dialog__body > *, .so-dialog__footer, .so-dialog__footer > *, .so-dialog__close',
			10,
		],
		[
			'drawer',
			'Открыть панель',
			'.so-drawer__backdrop, .so-drawer, .so-drawer__title, .so-drawer__body, .so-drawer__body > *, .so-drawer__footer, .so-drawer__footer > *, .so-drawer__close',
			10,
		],
		[
			'toasts',
			'обычное',
			'.so-toasts:has(.so-toasts-item), .so-toasts-item, .so-toasts-item__card, .so-toasts-item__icon, .so-toasts-item__text, .so-toasts-item__content > *, .so-toasts-item__close',
			7,
		],
	])('%s: открытый стоит так же, как у Vue', async (component, opener, selector, parts) => {
		const vue = await openedBoxesOf('vue', component, opener, selector)
		const svelte = await openedBoxesOf('svelte', component, opener, selector)

		expect(svelte).toHaveLength(parts)
		expect(svelte[0].width).toBeGreaterThan(0)
		expect(svelte).toEqual(vue)
	})
})
