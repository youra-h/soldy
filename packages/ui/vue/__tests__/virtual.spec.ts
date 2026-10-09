/**
 * Virtual во Vue — окно над ListBox и Table на настоящей разметке.
 *
 * Обёртка своего узла не рисует: её окно подхватывают коллекции внутри
 * (`TVirtualCollectionExtension`), и список рисует только видимые элементы, а
 * на месте остальных — распорки под `aria-hidden`. Что попадает в окно,
 * решает ядро (`core/__tests__/collection.draw.spec.ts`), замер — плагин
 * (`plugins/__tests__/virtual.plugin.spec.ts`); раскладки в jsdom нет, и
 * замер здесь подаётся ядру руками. Таблица в окне —
 * `table.spec.ts`, «окно»; в настоящем браузере —
 * `playground/vue/browser/list-box-virtual.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { createEngineListBox } from '@soldy-ui/core'
import type { IListBoxItem, TListBoxCollection } from '@soldy-ui/core'
import { ListBox, Virtual } from '@soldy-ui/vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(content: () => VNode): Promise<void> {
	wrapper = mount(defineComponent({ render: content }), { attachTo: document.body })

	await settle()
}

async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
}

/** `count` элементов: значение `v1`… и текст. */
function items(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		value: `v${index + 1}`,
		text: `Пункт ${index + 1}`,
	}))
}

/** Движок списка снаружи — тест подаёт ему замер. */
function engineOf(count: number): TListBoxCollection {
	return createEngineListBox({ items: items(count) })
}

const options = (root: ParentNode = document) => [...root.querySelectorAll('.s-list-box-item')]
const fillers = (root: ParentNode = document) => [
	...root.querySelectorAll<HTMLElement>('.s-list-box__filler'),
]

/** Строка элемента: на ней набор `aria` элемента. */
function optionRow(text: string): HTMLElement {
	const row = [...document.querySelectorAll<HTMLElement>('.s-list-box-item > .s-button')].find(
		(node) => node.textContent?.trim() === text,
	)

	if (!row) throw new Error(`${text}: строки нет`)

	return row
}

describe('ListBox в окне', () => {
	it('без обёртки — все элементы, распорок нет', async () => {
		await render(() => h(ListBox, { items: items(80) }))

		expect(options()).toHaveLength(80)
		expect(fillers()).toEqual([])
	})

	it('в обёртке — до замера первые 50, без распорок', async () => {
		await render(() => h(Virtual, () => h(ListBox, { items: items(80) })))

		expect(options()).toHaveLength(50)
		expect(fillers()).toEqual([])
	})

	it('по замеру — распорки на месте пропущенных: скрыты, высотой в элементы', async () => {
		const engine = engineOf(200)

		await render(() => h(Virtual, () => h(ListBox, { engine })))

		// Видны места 100–109: с запасом — 90–119
		engine.extensions.draw.notifyViewport({ top: 3000, bottom: 3300, step: 30 })
		await settle()

		const root = document.querySelector('.s-list-box')

		if (!root) throw new Error('списка нет')

		expect(fillers(root).map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		expect(
			fillers(root).map((filler) => filler.style.getPropertyValue('--s-filler-height')),
		).toEqual(['2700px', '2400px'])
		expect(root.firstElementChild).toBe(fillers(root)[0])
		expect(root.lastElementChild).toBe(fillers(root)[1])
		expect(options(root)).toHaveLength(30)
	})

	it('нарисованным — размер набора и место в нём', async () => {
		const engine = engineOf(200)

		await render(() => h(Virtual, () => h(ListBox, { engine })))

		engine.extensions.draw.notifyViewport({ top: 3000, bottom: 3300, step: 30 })
		await settle()

		const row = optionRow('Пункт 91')

		expect(row.getAttribute('aria-setsize')).toBe('200')
		expect(row.getAttribute('aria-posinset')).toBe('91')
	})

	it('`enabled` выключает и включает окно на лету', async () => {
		const enabled = ref(false)

		await render(() =>
			h(Virtual, { enabled: enabled.value }, () => h(ListBox, { items: items(80) })),
		)

		expect(options()).toHaveLength(80)
		expect(optionRow('Пункт 1').hasAttribute('aria-posinset')).toBe(false)

		enabled.value = true
		await settle()

		expect(options()).toHaveLength(50)
		expect(optionRow('Пункт 1').getAttribute('aria-posinset')).toBe('1')
	})

	it('список в слоте элемента окна не наследует', async () => {
		await render(() =>
			h(Virtual, () =>
				h(
					ListBox,
					{ class: 'outer', items: items(60) },
					{
						item: ({ item }: { item: IListBoxItem }) =>
							item.value === 'v1'
								? h(ListBox, { class: 'inner', items: items(55) })
								: item.text,
					},
				),
			),
		)

		const inner = document.querySelector('.inner')

		if (!inner) throw new Error('вложенного списка нет')

		expect(options(inner)).toHaveLength(55)
		// У внешнего — окно: 50 своих элементов и 55 вложенного внутри первого
		expect(options(document.querySelector('.outer') ?? document)).toHaveLength(50 + 55)
	})
})
