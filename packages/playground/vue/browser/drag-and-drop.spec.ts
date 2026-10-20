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
 * Правила команды — `core/__tests__/drag-and-drop.spec.ts`, жест —
 * `plugins/__tests__/collection-elements.plugin.spec.ts`, разметка —
 * `ui/vue/__tests__/drag-and-drop.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Accordion, DragAndDrop, ListBox, Tabs } from '@soldy-ui/vue'
import type { IDragAndDropMove } from '@soldy-ui/core'

import '@soldy-ui/theme-oren'

const ITEMS = ['a', 'b', 'c'].map((value) => ({ value, text: `Пункт ${value.toUpperCase()}` }))

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

/** Узел элемента коллекции по тексту элемента. */
function nodeOf(selector: string, text: string): HTMLElement {
	const node = [...document.querySelectorAll<HTMLElement>(selector)].find((each) =>
		each.textContent?.includes(text),
	)

	if (!node) throw new Error(`${selector}: элемента «${text}» нет`)

	return node
}

/** Значения элементов коллекции по их коробкам на экране — вдоль её оси. */
function onScreen(selector: string, axis: 'x' | 'y'): string[] {
	return [...document.querySelectorAll<HTMLElement>(selector)]
		.map((node) => {
			const box = node.getBoundingClientRect()
			const item = ITEMS.find(({ text }) => node.textContent?.includes(text))

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

			expect(onScreen(item, axis)).toEqual(['a', 'b', 'c'])

			await userEvent.dragAndDrop(nodeOf(handle, 'Пункт A'), nodeOf(handle, 'Пункт C'))
			await frames()

			expect(onScreen(item, axis)).toEqual(['b', 'c', 'a'])
			expect(moved.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([[0, 2]])
		},
	)

	it('элемент переставляется в своей коллекции: соседние не тронуты', async () => {
		await mount()

		await userEvent.dragAndDrop(
			nodeOf('.so-list-box-item', 'Пункт A'),
			nodeOf('.so-list-box-item', 'Пункт C'),
		)
		await frames()

		expect(onScreen('.so-list-box-item', 'y')).toEqual(['b', 'c', 'a'])
		expect(onScreen('.so-tabs-item', 'x')).toEqual(['a', 'b', 'c'])
		expect(onScreen('.so-accordion-item', 'y')).toEqual(['a', 'b', 'c'])
	})
})
