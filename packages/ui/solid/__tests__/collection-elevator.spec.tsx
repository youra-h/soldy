/**
 * Элемент коллекции в Solid: лифт и момент входа.
 *
 * Лифт Solid — слой значений в контексте (`useElevator`): владелец пишет в
 * свой слой движок и регистратор, детям его отдаёт `Elevate`, а элемент
 * читает слой, который увидел при сборке. Значение контекста Solid отдаёт
 * только тем, чьи узлы созданы под `Provider`, поэтому содержимое владельца
 * разворачивается внутри `Elevate`. Соседям и предкам слой не виден.
 *
 * В коллекцию элемент входит при выполнении своего тела — когда его контекст
 * принят (`attach` в `useAdapter`). Дети выполняются в порядке документа, и
 * элементы разметки входят в коллекцию в порядке DOM. Пересборки компонента у
 * Solid нет: он собирается один раз, как у Vue и Svelte.
 *
 * Здесь прогон в браузерной сборке разработки, где у каждого компонента свой
 * владелец. Без него — как в продакшене и на сервере — значение, записанное
 * мимо `Provider`, увидели бы соседи владельца; это проверяет
 * `collections.server.spec.tsx`.
 */

import { describe, it, expect } from 'vitest'
import { createSignal, For } from 'solid-js'
import { Accordion, ListBox, Tabs, type ListBoxProps } from '@soldy-ui/solid'
import { mount } from './mount'

/** Движок так, как его видит тест: состав элементов по значениям. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

type TEngineProbe = NonNullable<ListBoxProps['onEngineCreate']>

/** Движки, объявленные владельцем (`engine:create`): последний — живой. */
function engineProbe() {
	const engines: TEngineView[] = []

	return {
		onEngineCreate: ((engine: TEngineView) => {
			engines.push(engine)
		}) satisfies TEngineProbe,
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
}

const rows = () => [...document.querySelectorAll('.so-list-box-item .so-button')]

function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

describe('лифт', () => {
	/**
	 * Элемент вне списка — и до него, и после — коллекции не видит: слой списка
	 * получают только узлы под его `Elevate`.
	 */
	it.each(['до списка', 'после списка'] as const)(
		'элемент %s никуда не входит и рисуется без коллекции',
		async (place) => {
			const probe = engineProbe()

			mount(() => (
				<div>
					{place === 'до списка' ? <ListBox.Item value="z" text="Z" /> : null}
					<ListBox onEngineCreate={probe.onEngineCreate}>
						<ListBox.Item value="a" text="A" />
					</ListBox>
					{place === 'после списка' ? <ListBox.Item value="z" text="Z" /> : null}
				</div>
			))
			await flush()

			expect(probe.values()).toEqual(['a'])
			// `aria-selected` пишет коллекция: у элемента вне неё атрибута нет
			expect(rowOf('Z').hasAttribute('aria-selected')).toBe(false)

			rowOf('Z').click()

			expect(probe.values()).toEqual(['a'])
		},
	)

	it('два списка рядом: у каждого свои элементы', async () => {
		const left = engineProbe()
		const right = engineProbe()

		mount(() => (
			<div>
				<ListBox onEngineCreate={left.onEngineCreate}>
					<ListBox.Item value="a" text="A" />
					<ListBox.Item value="b" text="B" />
				</ListBox>
				<ListBox onEngineCreate={right.onEngineCreate}>
					<ListBox.Item value="x" text="X" />
					<ListBox.Item value="y" text="Y" />
					<ListBox.Item value="z" text="Z" />
				</ListBox>
			</div>
		))
		await flush()

		expect(left.values()).toEqual(['a', 'b'])
		expect(right.values()).toEqual(['x', 'y', 'z'])
	})

	/**
	 * Список внутри элемента опускает свой слой поверх слоя внешнего: его
	 * элементы видят его движок, а элемент внешнего — внешний.
	 */
	it('список внутри элемента: элементы входят каждый в свой', async () => {
		const outer = engineProbe()
		const inner = engineProbe()

		mount(() => (
			<ListBox onEngineCreate={outer.onEngineCreate}>
				<ListBox.Item
					value="a"
					text="A"
					trailing={
						<ListBox onEngineCreate={inner.onEngineCreate}>
							<ListBox.Item value="x" text="X" />
							<ListBox.Item value="y" text="Y" />
						</ListBox>
					}
				/>
				<ListBox.Item value="b" text="B" />
			</ListBox>
		))
		await flush()

		expect(outer.values()).toEqual(['a', 'b'])
		expect(inner.values()).toEqual(['x', 'y'])
	})

	/** Список в панели секции: его элементы — в списке, секции — в аккордеоне. */
	it('список в секции Accordion собирает свои элементы', async () => {
		const accordion = engineProbe()
		const list = engineProbe()

		mount(() => (
			<Accordion onEngineCreate={accordion.onEngineCreate}>
				<Accordion.Item value="s" text="Секция" selected>
					<ListBox onEngineCreate={list.onEngineCreate}>
						<ListBox.Item value="x" text="X" />
						<ListBox.Item value="y" text="Y" />
					</ListBox>
				</Accordion.Item>
				<Accordion.Item value="t" text="Вторая" />
			</Accordion>
		))
		await flush()

		expect(accordion.values()).toEqual(['s', 't'])
		expect(list.values()).toEqual(['x', 'y'])
	})

	it('элементы разметки добавляются и снимаются после монтирования', async () => {
		const probe = engineProbe()
		const [values, setValues] = createSignal(['a', 'b'])

		mount(() => (
			<ListBox onEngineCreate={probe.onEngineCreate}>
				<For each={values()}>
					{(value) => <ListBox.Item value={value} text={value.toUpperCase()} />}
				</For>
			</ListBox>
		))
		await flush()

		setValues(['a', 'b', 'c'])

		expect(probe.values()).toEqual(['a', 'b', 'c'])

		setValues(['a', 'c'])

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

		mount(() => (
			<Tabs
				onEngineCreate={probe.onEngineCreate}
				content={
					<For each={['a', 'b', 'c']}>
						{(value) => (
							<Tabs.Content value={value}>Панель {value.toUpperCase()}</Tabs.Content>
						)}
					</For>
				}
			>
				<Tabs.Item value="a" text="A" active />
				<Tabs.Item value="b" text="B" />
				<Tabs.Item value="c" text="C" />
			</Tabs>
		))
		await flush()

		expect(probe.values()).toEqual(['a', 'b', 'c'])
		expect(panels()).toEqual(['Панель A'])

		tab('B').click()

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

		mount(() => (
			<Accordion onEngineCreate={probe.onEngineCreate}>
				<Accordion.Item value="a" text="A" selected />
				<Accordion.Item value="b" text="B" />
				<Accordion.Item value="c" text="C" />
			</Accordion>
		))
		await flush()

		expect(probe.values()).toEqual(['a', 'b', 'c'])
		expect(expanded()).toEqual(['true', 'false', 'false'])

		// Режим по умолчанию — одна раскрытая секция
		header('B').click()

		expect(expanded()).toEqual(['false', 'true', 'false'])
	})
})
