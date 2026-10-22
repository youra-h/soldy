/**
 * DragAndDrop в настоящем браузере: перетаскивание мышью переставляет элемент
 * у Tabs, ListBox и Accordion на экране, и обёртка сообщает об этом `move`.
 *
 * Жест здесь — нативное перетаскивание Chromium (`draggable`, `dragstart`,
 * `dragover`, `drop`), а не события, поданные руками, как в jsdom: в jsdom
 * нет ни `DragEvent`, ни жеста браузера, ни раскладки. Элементы коллекций
 * стоят флексом по месту в составе (`order`), а не порядком DOM, поэтому
 * порядок на экране — по коробкам элементов, а не по узлам.
 *
 * Сначала — обёртка Vue на своей разметке, потом — страница стенда у каждого
 * фреймворка (`FRAMEWORKS`): превью рисует хост фреймворка, и жест браузера
 * переставляет элементы коллекций его адаптера так же, как у Vue.
 *
 * Правила команды — `core/__tests__/drag-and-drop.spec.ts`, жест —
 * `plugins/__tests__/collection-elements.plugin.spec.ts`, разметка —
 * `ui/<адаптер>/__tests__/drag-and-drop.spec.*`.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { useIcons } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { Accordion, DragAndDrop, ListBox, Tabs } from '@soldy-ui/vue'
import type { IDragAndDropMove } from '@soldy-ui/core'
import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
import { FRAMEWORKS } from '../src/hosts'
import { router } from '../src/router'
import { renderStand } from './stand'

import '@soldy-ui/theme-oren'
import '../src/styles.css'

// Пакет иконок — как в точке входа стенда: стрелки секций рисуются по роли.
// Поведение темы ставит общий файл настройки (`browser/setup.ts`)
useIcons(material)

/** Элемент коллекции: значение и текст. */
type TItem = { readonly value: string; readonly text: string }

const ITEMS: TItem[] = ['a', 'b', 'c'].map((value) => ({
	value,
	text: `Пункт ${value.toUpperCase()}`,
}))

/** Несколько кадров: узлы плагинам, перерисовка после перестановки. */
async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

/** Перестановки, о которых сообщила обёртка, — за тест. */
let moved: IDragAndDropMove[] = []

afterEach(() => {
	cleanup()
	moved = []
})

/**
 * Три коллекции в обёртке, столбцом: табы — разметкой, первый активен,
 * список — данными, секции — разметкой с содержимым.
 */
async function mount(): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h(DragAndDrop, { onMove: (e: IDragAndDropMove) => moved.push(e) }, () =>
					h(
						'div',
						{ style: 'display:flex; flex-direction:column; gap:24px; width:480px' },
						[
							h(Tabs, null, () =>
								ITEMS.map((item, index) =>
									h(Tabs.Item, { key: item.value, active: index === 0, ...item }),
								),
							),
							h(ListBox, { items: ITEMS, aria_label: 'Пункты' }),
							h(Accordion, null, () =>
								ITEMS.map((item) =>
									h(
										Accordion.Item,
										{ key: item.value, ...item },
										() => `Содержимое ${item.text}`,
									),
								),
							),
						],
					),
				),
		}),
	)

	await frames()
}

/** Узел элемента коллекции по тексту элемента — внутри `root`. */
function nodeOf(root: ParentNode, selector: string, text: string): HTMLElement {
	const node = [...root.querySelectorAll<HTMLElement>(selector)].find((each) =>
		each.textContent?.includes(text),
	)

	if (!node) throw new Error(`${selector}: элемента «${text}» нет`)

	return node
}

/** Значения элементов коллекции внутри `root` по их коробкам на экране — вдоль её оси. */
function onScreen(
	root: ParentNode,
	selector: string,
	axis: 'x' | 'y',
	items: readonly TItem[] = ITEMS,
): string[] {
	return [...root.querySelectorAll<HTMLElement>(selector)]
		.map((node) => {
			const box = node.getBoundingClientRect()
			const item = items.find(({ text }) => node.textContent?.includes(text))

			return { value: item?.value ?? '?', at: axis === 'x' ? box.left : box.top }
		})
		.sort((first, second) => first.at - second.at)
		.map(({ value }) => value)
}

/** Коллекции: где берут элемент и ось, вдоль которой стоят элементы. */
const COLLECTIONS = [
	['Tabs', '.so-tabs-item', '.so-tabs-item', 'x'],
	['ListBox', '.so-list-box-item', '.so-list-box-item', 'y'],
	['Accordion', '.so-accordion-item', '.so-accordion-item__header', 'y'],
] as const

describe('перестановка мышью', () => {
	it.each(COLLECTIONS)(
		'%s: первый элемент, перетащенный на третий, встаёт третьим на экране',
		async (_, item, handle, axis) => {
			await mount()

			expect(onScreen(document, item, axis)).toEqual(['a', 'b', 'c'])

			await userEvent.dragAndDrop(
				nodeOf(document, handle, 'Пункт A'),
				nodeOf(document, handle, 'Пункт C'),
			)
			await frames()

			expect(onScreen(document, item, axis)).toEqual(['b', 'c', 'a'])
			expect(moved.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([[0, 2]])
		},
	)

	it('элемент переставляется в своей коллекции: соседние не тронуты', async () => {
		await mount()

		await userEvent.dragAndDrop(
			nodeOf(document, '.so-list-box-item', 'Пункт A'),
			nodeOf(document, '.so-list-box-item', 'Пункт C'),
		)
		await frames()

		expect(onScreen(document, '.so-list-box-item', 'y')).toEqual(['b', 'c', 'a'])
		expect(onScreen(document, '.so-tabs-item', 'x')).toEqual(['a', 'b', 'c'])
		expect(onScreen(document, '.so-accordion-item', 'y')).toEqual(['a', 'b', 'c'])
	})
})

/**
 * Палец — событиями касания протокола DevTools (`commands.touchDrag`), как на
 * телефоне: нативного перетаскивания у касания нет, и элемент берёт долгое
 * нажатие (`TDragPlugin`, 450 мс). Касание, сразу ушедшее в сторону, —
 * прокрутка, и элемент остаётся на месте.
 */
describe('перестановка пальцем', () => {
	/** Сколько палец стоит до первого шага: дольше долгого нажатия плагина. */
	const HOLD = 700

	/** Узел элемента — селектором для команды: метка на узле, пока идёт тест. */
	const mark = (node: HTMLElement): string => {
		node.dataset.testTouch = ''

		return '[data-test-touch]'
	}

	/** Сдвиг от центра одного узла до центра другого. */
	const between = (from: HTMLElement, to: HTMLElement) => {
		const a = from.getBoundingClientRect()
		const b = to.getBoundingClientRect()

		return {
			dx: b.left + b.width / 2 - (a.left + a.width / 2),
			dy: b.top + b.height / 2 - (a.top + a.height / 2),
		}
	}

	it.each(COLLECTIONS)(
		'%s: первый элемент, взятый долгим нажатием и перенесённый на третий, встаёт третьим',
		async (_, item, handle, axis) => {
			await mount()

			const from = nodeOf(document, handle, 'Пункт A')
			const { dx, dy } = between(from, nodeOf(document, handle, 'Пункт C'))

			await commands.touchDrag(mark(from), dx, dy, 10, HOLD)
			await frames()

			expect(onScreen(document, item, axis)).toEqual(['b', 'c', 'a'])
			// Палец идёт шагами и по пути проходит над вторым: перестановка
			// живая, элемент встаёт под пальцем на каждом новом месте
			expect(moved.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([
				[0, 1],
				[1, 2],
			])
		},
	)

	it('касание, сразу ушедшее в сторону, — прокрутка: элемент остаётся на месте', async () => {
		await mount()

		const from = nodeOf(document, '.so-list-box-item', 'Пункт A')
		const { dx, dy } = between(from, nodeOf(document, '.so-list-box-item', 'Пункт C'))

		await commands.touchDrag(mark(from), dx, dy)
		await frames()

		expect(onScreen(document, '.so-list-box-item', 'y')).toEqual(['a', 'b', 'c'])
		expect(moved).toEqual([])
	})
})

/** Ожидание после смены страницы: хост фреймворка грузится лениво, превью — его отрисовкой. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** Состав превью стенда — общий у всех хостов. */
const PREVIEW_ITEMS: readonly TItem[] = COLLECTION_ITEMS

/** Каждая коллекция у каждого фреймворка стенда. */
const PAGES = FRAMEWORKS.flatMap(({ id }) =>
	COLLECTIONS.map(([name, item, handle, axis]) => [id, name, item, handle, axis] as const),
)

describe('перестановка на странице стенда', () => {
	beforeEach(async () => {
		document.documentElement.dataset.soTheme = 'oren'

		await router.push('/vue')

		renderStand()

		await settle()
	})

	/**
	 * Сцена страницы без строк — колонки строки: пропсами превью и над
	 * экземпляром. Жест — в первой колонке; вторая — свои коллекции со своим
	 * составом.
	 */
	it.each(PAGES)(
		'%s · %s: первый элемент первой колонки, перетащенный на третий, встаёт третьим на экране',
		async (framework, _, item, handle, axis) => {
			await router.push(`/${framework}/drag-and-drop`)
			await settle()

			const [stage, other] = [...document.querySelectorAll('.pg-scene .pg-col__stage')]

			if (!stage || !other) throw new Error(`${framework}: колонок сцены нет`)

			const [first, , third] = PREVIEW_ITEMS
			const values = PREVIEW_ITEMS.map(({ value }) => value)

			expect(onScreen(stage, item, axis, PREVIEW_ITEMS)).toEqual(values)

			await userEvent.dragAndDrop(
				nodeOf(stage, handle, first.text),
				nodeOf(stage, handle, third.text),
			)
			await frames()

			expect(onScreen(stage, item, axis, PREVIEW_ITEMS)).toEqual([
				values[1],
				values[2],
				values[0],
				...values.slice(3),
			])
			expect(onScreen(other, item, axis, PREVIEW_ITEMS)).toEqual(values)
		},
	)
})
