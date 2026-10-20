/**
 * useRootElement — корень компонента значением рендера: `null` на сервере и до
 * коммита, узел после.
 *
 * Во Vue корень — `ref`, и шаблон читает его реактивно: Popover и Tooltip
 * отдают его своему Frame якорем. В React корень приходит только в
 * ref-функцию при коммите, и значением его делает хук адаптера — подпиской на
 * ref корня (`TRootRef`), без своего хранилища. Здесь проверено, что значение
 * то самое — корень, привязанный к `TElementPlugin`, и у пересобранного
 * контекста тоже, — что оповещает ref корня только о смене узла, а
 * подписываются только компоненты с хуком: остальные лишней перерисовки после
 * монтирования не получают.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, createRef, type ElementType, type ReactNode, type Ref } from 'react'
import { renderToString } from 'react-dom/server'
import { TElementPlugin } from '@soldy-ui/plugins'
import { ComponentViewDescriptor, createAdapterContext } from '@soldy-ui/setup'
import type { IAdapterContext } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useRootElement } from '@soldy-ui/react'
import { TRootRef } from '../src/adapter/runtime/root-ref.class'
import { mount } from './mount'

type TProbeProps = {
	/** Тег корня: смена рисует корень заново. */
	tag?: string
	/** `ref` потребителя: его смена узел не меняет. */
	consumer?: Ref<Element>
}

/**
 * Пробник: компонент со своим контекстом и корнем по `tag`. Снаружи видны
 * значение хука на каждом рендере и контекст, с которым шёл рендер.
 */
function createProbe() {
	const seen: (Element | null)[] = []
	const contexts: IAdapterContext[] = []

	function Probe({ tag = 'div', consumer }: TProbeProps): ReactNode {
		const { contexts: adapter } = useAdapterContext((create) =>
			create(ComponentViewDescriptor(), { props: {} }),
		)
		const binding = useAdapter(adapter, { ref: consumer })

		seen.push(useRootElement(binding.root))
		contexts.push(adapter)

		const Tag = tag as ElementType

		return <Tag className="so-test-probe" ref={binding.ref} />
	}

	return { Probe, seen, contexts }
}

/** Корень пробника в документе. */
function probeRoot(): Element {
	const found = document.querySelector('.so-test-probe')

	if (!found) throw new Error('корня пробника нет')

	return found
}

/** Узел, привязанный к `TElementPlugin` контекста. */
const boundOf = (context: IAdapterContext | undefined) =>
	context?.bundle?.get(TElementPlugin)?.element ?? null

describe('useRootElement', () => {
	it('в первом рендере — null, после коммита — корень, привязанный к плагинам', () => {
		const { Probe, seen, contexts } = createProbe()

		mount(<Probe />)

		expect(seen).toHaveLength(2)
		expect(seen[0]).toBeNull()
		expect(seen[1]).toBe(probeRoot())
		expect(boundOf(contexts.at(-1))).toBe(probeRoot())
	})

	it('на сервере — null: ref узлов React там не зовёт', () => {
		const { Probe, seen } = createProbe()

		renderToString(<Probe />)

		expect(seen).toEqual([null])
	})

	it('смена тега — новый корень', () => {
		const { Probe, seen } = createProbe()
		const { render } = mount(<Probe />)
		const first = probeRoot()

		render(<Probe tag="span" />)

		expect(probeRoot()).not.toBe(first)
		expect(seen.at(-1)).toBe(probeRoot())
	})

	/**
	 * StrictMode уничтожает первый контекст лишним циклом эффектов, и хук
	 * собирает второй: значение — корень, привязанный к живому контексту, а
	 * следующий новый корень приходит уже от его ref корня.
	 */
	it('StrictMode: у пересобранного контекста — его корень', () => {
		const { Probe, seen, contexts } = createProbe()
		const { render } = mount(
			<StrictMode>
				<Probe />
			</StrictMode>,
		)
		const live = contexts.at(-1)

		expect(new Set(contexts).size).toBe(2)
		expect(seen.at(-1)).toBe(probeRoot())
		expect(boundOf(live)).toBe(probeRoot())

		render(
			<StrictMode>
				<Probe tag="span" />
			</StrictMode>,
		)

		expect(contexts.at(-1)).toBe(live)
		expect(seen.at(-1)).toBe(probeRoot())
		expect(probeRoot().localName).toBe('span')
	})

	it('смена ref потребителя узел не меняет и лишней перерисовки не даёт', () => {
		const { Probe, seen } = createProbe()
		const { render } = mount(<Probe consumer={createRef()} />)
		const consumer = createRef<Element>()
		const before = seen.length

		render(<Probe consumer={consumer} />)

		// Одна перерисовка — от родителя; от ref корня — ни одной
		expect(seen.length).toBe(before + 1)
		expect(seen.at(-1)).toBe(probeRoot())
		expect(consumer.current).toBe(probeRoot())
	})

	/**
	 * Подписку на корень заводит только хук: компонент без него рисуется при
	 * монтировании один раз — и строка таблицы, и кнопка.
	 */
	it('компонент без хука после монтирования не перерисовывается', () => {
		let renders = 0

		function Plain(): ReactNode {
			const { contexts: adapter } = useAdapterContext((create) =>
				create(ComponentViewDescriptor(), { props: {} }),
			)
			const binding = useAdapter(adapter, {})

			renders++

			return <div ref={binding.ref} />
		}

		mount(<Plain />)

		expect(renders).toBe(1)
	})
})

/**
 * Источник значения — сам ref корня: подписка и снимок без своего хранилища.
 * Оповещает он только о смене узла, а уничтоженный не держит ни узла, ни
 * подписчиков.
 */
describe('TRootRef: корень подпиской', () => {
	function rootRef() {
		const context = createAdapterContext(ComponentViewDescriptor(), { props: {} })

		return { context, root: new TRootRef(context) }
	}

	it('подписчик узнаёт о смене узла, о том же узле — нет', () => {
		const { context, root } = rootRef()
		const listener = vi.fn()
		const node = document.createElement('div')

		root.subscribe(listener)
		root.attach(node)
		root.attach(node)

		expect(listener).toHaveBeenCalledTimes(1)
		expect(root.getSnapshot()).toBe(node)

		root.attach(null)

		expect(listener).toHaveBeenCalledTimes(2)
		expect(root.getSnapshot()).toBeNull()

		context.destroy()
	})

	it('отписанный не оповещается', () => {
		const { context, root } = rootRef()
		const listener = vi.fn()
		const unsubscribe = root.subscribe(listener)

		unsubscribe()
		root.attach(document.createElement('div'))

		expect(listener).not.toHaveBeenCalled()

		context.destroy()
	})

	it('уничтоженный: узла нет, подписчиков не держит и не заводит', () => {
		const { context, root } = rootRef()
		const before = vi.fn()
		const after = vi.fn()

		root.subscribe(before)
		root.attach(document.createElement('div'))
		context.destroy()

		expect(root.getSnapshot()).toBeNull()

		root.subscribe(after)
		root.attach(document.createElement('div'))

		expect(before).toHaveBeenCalledTimes(1)
		expect(after).not.toHaveBeenCalled()
		expect(root.getSnapshot()).toBeNull()
	})
})
