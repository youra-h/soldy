/**
 * Элемент коллекции в Svelte: лифт и момент входа.
 *
 * Лифт Svelte — контекст компонента: список опускает движок и регистратор
 * (`setContext` в сборке), элемент читает их при своей инициализации
 * (`getContext`). Контекст Svelte наследуют все компоненты, которые список
 * рисует, — и содержимое, которое ему передали сниппетом, — а соседям и
 * предкам он не виден.
 *
 * В коллекцию элемент входит при инициализации — когда его контекст принят
 * (`attach` в `useAdapter`). Дети инициализируются в порядке документа, и
 * элементы разметки входят в коллекцию в порядке DOM. Пересборки компонента у
 * Svelte нет: он собирается один раз, как у Vue.
 */

import { describe, it, expect } from 'vitest'
import { flushSync, type ComponentProps } from 'svelte'
import Elevator from './Elevator.test.svelte'
import AccordionHarness from './Accordion.test.svelte'
import ListBoxHarness from './ListBox.test.svelte'
import TabsHarness from './Tabs.test.svelte'
import { mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** Движок так, как его видит тест: состав элементов по значениям. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

/** Движки, объявленные владельцем (`engine:create`): последний — живой. */
function engineProbe() {
	const engines: TEngineView[] = []

	return {
		onEngineCreate: (engine: TEngineView) => {
			engines.push(engine)
		},
		/** Значения элементов живого движка по порядку. */
		values: () => {
			const engine = engines.at(-1)

			if (!engine) throw new Error('владелец не объявил движок')

			return engine.extensions.batch.items.map((item) => Reflect.get(item, 'value'))
		},
	}
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
async function flush(): Promise<void> {
	await Promise.resolve()
	flushSync()
}

const rows = () => [...document.querySelectorAll('.so-list-box-item .so-button')]

function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

function click(element: HTMLElement): void {
	element.click()
	flushSync()
}

describe('лифт', () => {
	it('элемент вне списка никуда не входит и рисуется без коллекции', async () => {
		const probe = engineProbe()

		mount(Elevator, { case: 'outside', onFirst: probe.onEngineCreate })
		await flush()

		expect(probe.values()).toEqual(['a'])
		// `aria-selected` пишет коллекция: у элемента вне неё атрибута нет
		expect(rowOf('Z').hasAttribute('aria-selected')).toBe(false)

		click(rowOf('Z'))

		expect(probe.values()).toEqual(['a'])
	})

	it('два списка рядом: у каждого свои элементы', async () => {
		const left = engineProbe()
		const right = engineProbe()

		mount(Elevator, {
			case: 'siblings',
			onFirst: left.onEngineCreate,
			onSecond: right.onEngineCreate,
		})
		await flush()

		expect(left.values()).toEqual(['a', 'b'])
		expect(right.values()).toEqual(['x', 'y', 'z'])
	})

	/**
	 * Список внутри элемента опускает свой контекст поверх контекста внешнего:
	 * его элементы видят его движок, а элемент внешнего — внешний.
	 */
	it('список внутри элемента: элементы входят каждый в свой', async () => {
		const outer = engineProbe()
		const inner = engineProbe()

		mount(Elevator, {
			case: 'nested',
			onFirst: outer.onEngineCreate,
			onSecond: inner.onEngineCreate,
		})
		await flush()

		expect(outer.values()).toEqual(['a', 'b'])
		expect(inner.values()).toEqual(['x', 'y'])
	})

	it('элементы разметки добавляются и снимаются после монтирования', async () => {
		const probe = engineProbe()
		const items = (values: string[]) =>
			values.map((value) => ({ value, text: value.toUpperCase() }))
		const props = reactiveProps<ComponentProps<typeof ListBoxHarness>>({
			list: { onEngineCreate: probe.onEngineCreate },
			items: items(['a', 'b']),
		})

		mount(ListBoxHarness, props)
		await flush()

		props.items = items(['a', 'b', 'c'])
		flushSync()

		expect(probe.values()).toEqual(['a', 'b', 'c'])

		props.items = items(['a', 'c'])
		flushSync()

		expect(probe.values()).toEqual(['a', 'c'])
		expect(rows()).toHaveLength(2)
	})
})

/**
 * Tabs и Accordion: та же механика, что у ListBox. В движке ровно элементы
 * разметки, по одному разу и в порядке DOM, и клик работает с ним:
 * активирует таб вместе с его панелью, раскрывает секцию.
 */
describe('элементы разметки в движке владельца', () => {
	const tabs = () => [...document.querySelectorAll('[role="tab"]')]

	function tab(text: string): HTMLElement {
		const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

		if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

		return found
	}

	const headers = () => [...document.querySelectorAll('.so-accordion-item__header')]

	function header(text: string): HTMLElement {
		const found = headers().find((candidate) => candidate.textContent?.trim() === text)

		if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

		return found
	}

	it('табы: в движке ровно табы разметки; клик активирует таб и его панель', async () => {
		const probe = engineProbe()
		const panels = () =>
			[...document.querySelectorAll('.so-tabs__panel')].map((panel) => panel.textContent)

		mount(TabsHarness, {
			tabs: { onEngineCreate: probe.onEngineCreate },
			items: [
				{ value: 'a', text: 'A', active: true },
				{ value: 'b', text: 'B' },
				{ value: 'c', text: 'C' },
			],
			panels: ['a', 'b', 'c'].map((value) => ({
				value,
				text: `Панель ${value.toUpperCase()}`,
			})),
		})
		await flush()

		expect(probe.values()).toEqual(['a', 'b', 'c'])
		expect(panels()).toEqual(['Панель A'])

		click(tab('B'))

		expect(tabs().map((row) => row.getAttribute('aria-selected'))).toEqual([
			'false',
			'true',
			'false',
		])
		expect(panels()).toEqual(['Панель B'])
	})

	it('секции: в движке ровно секции разметки; клик раскрывает секцию', async () => {
		const probe = engineProbe()
		const expanded = () => headers().map((node) => node.getAttribute('aria-expanded'))

		mount(AccordionHarness, {
			accordion: { onEngineCreate: probe.onEngineCreate },
			items: [
				{ value: 'a', text: 'A', selected: true },
				{ value: 'b', text: 'B' },
				{ value: 'c', text: 'C' },
			],
		})
		await flush()

		expect(probe.values()).toEqual(['a', 'b', 'c'])
		expect(expanded()).toEqual(['true', 'false', 'false'])

		// Режим по умолчанию — одна раскрытая секция
		click(header('B'))

		expect(expanded()).toEqual(['false', 'true', 'false'])
	})
})
