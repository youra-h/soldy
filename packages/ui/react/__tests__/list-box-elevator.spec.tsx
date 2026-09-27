/**
 * Элемент коллекции в React: лифт и момент входа.
 *
 * Лифт React — контекст со слоем значений: список опускает в свой слой движок
 * и регистратор (`down()`), элемент читает их из слоя, который увидел на
 * рендере (`up()`). Слой списка детям отдаёт `Elevate`.
 *
 * В коллекцию элемент входит не на рендере, а при коммите — когда его принимает
 * `useAdapterContext` (`attach` контекста). На рендере вход был бы ошибкой: отброшенный
 * рендер оставил бы в движке фантом, а элемент, добавленный после
 * монтирования, обновлял бы список посреди рендера ребёнка — React пишет об
 * этом в консоль, и сторож консоли уронил бы тест.
 *
 * Пересобранный список (StrictMode, `<Activity>`) — это новый движок. Элемент
 * пересобирается вслед за ним: сменилось прочитанное через лифт. В живом
 * движке остаются ровно элементы разметки, по одному разу и в порядке DOM.
 *
 * Цена входа при коммите: серверная разметка и первый кадр элемента из
 * разметки — без того, что пишет ему коллекция. Гидратация сходится, после
 * коммита всё на месте. Список из данных (`items`) сервер рисует полностью.
 */

import { describe, it, expect, vi } from 'vitest'
import { Activity, StrictMode, act, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { ListBox } from '@soldy-ui/react'
import { mount, track } from './mount'

/** Движок так, как его видит тест: состав элементов по значениям. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

/** Движки, объявленные списком (`engine:create`): последний — живой. */
function engineProbe() {
	const engines: TEngineView[] = []

	return {
		onEngineCreate: (engine: TEngineView) => {
			engines.push(engine)
		},
		/** Значения элементов живого движка по порядку. */
		values: () => {
			const engine = engines.at(-1)

			if (!engine) throw new Error('список не объявил движок')

			return engine.extensions.batch.items.map((item) => Reflect.get(item, 'value'))
		},
		engines,
	}
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
async function flush(): Promise<void> {
	await act(async () => {})
}

const rows = () => [...document.querySelectorAll('.s-list-box-item .s-button')]

const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!(row instanceof HTMLElement)) throw new Error(`строки элемента «${text}» нет`)

	return row
}

function List({ values, ...probe }: { values: readonly string[] } & TProbeProps): ReactNode {
	return (
		<ListBox {...probe}>
			{values.map((value) => (
				<ListBox.Item key={value} value={value} text={value.toUpperCase()} />
			))}
		</ListBox>
	)
}

type TProbeProps = { onEngineCreate?: (engine: TEngineView) => void }

describe('лифт', () => {
	it('элемент вне списка никуда не входит и рисуется без коллекции', async () => {
		const probe = engineProbe()

		mount(
			<div>
				<ListBox.Item value="z" text="Z" />
				<List values={['a']} onEngineCreate={probe.onEngineCreate} />
			</div>,
		)
		await flush()

		expect(probe.values()).toEqual(['a'])
		// `aria-selected` пишет коллекция: у элемента вне неё атрибута нет
		expect(rowOf('Z').hasAttribute('aria-selected')).toBe(false)

		act(() => rowOf('Z').click())

		expect(probe.values()).toEqual(['a'])
	})

	it('два списка рядом: у каждого свои элементы', async () => {
		const left = engineProbe()
		const right = engineProbe()

		mount(
			<div>
				<List values={['a', 'b']} onEngineCreate={left.onEngineCreate} />
				<List values={['x', 'y', 'z']} onEngineCreate={right.onEngineCreate} />
			</div>,
		)
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

		mount(
			<ListBox onEngineCreate={outer.onEngineCreate}>
				<ListBox.Item
					value="a"
					text="A"
					trailing={<List values={['x', 'y']} onEngineCreate={inner.onEngineCreate} />}
				/>
				<ListBox.Item value="b" text="B" />
			</ListBox>,
		)
		await flush()

		expect(outer.values()).toEqual(['a', 'b'])
		expect(inner.values()).toEqual(['x', 'y'])
	})

	it('элементы разметки добавляются и снимаются после монтирования', async () => {
		const probe = engineProbe()
		const { render } = mount(<List values={['a', 'b']} onEngineCreate={probe.onEngineCreate} />)

		await flush()

		render(<List values={['a', 'b', 'c']} onEngineCreate={probe.onEngineCreate} />)

		expect(probe.values()).toEqual(['a', 'b', 'c'])

		render(<List values={['a', 'c']} onEngineCreate={probe.onEngineCreate} />)

		expect(probe.values()).toEqual(['a', 'c'])
		expect(rows()).toHaveLength(2)
	})
})

describe('пересборка списка', () => {
	it('StrictMode: в живом движке ровно элементы разметки, в порядке DOM; клик выбирает', async () => {
		const probe = engineProbe()

		mount(
			<StrictMode>
				<List values={['a', 'b', 'c']} onEngineCreate={probe.onEngineCreate} />
			</StrictMode>,
		)
		await flush()

		expect(probe.values()).toEqual(['a', 'b', 'c'])
		expect(rows()).toHaveLength(3)

		act(() => rowOf('B').click())

		expect(selection()).toEqual(['false', 'true', 'false'])
	})

	it('<Activity>: после показа в живом движке ровно элементы разметки; клик выбирает', async () => {
		const probe = engineProbe()
		const view = (mode: 'visible' | 'hidden') => (
			<Activity mode={mode}>
				<List values={['a', 'b', 'c']} onEngineCreate={probe.onEngineCreate} />
			</Activity>
		)
		const { render } = mount(view('visible'))

		await flush()

		render(view('hidden'))
		render(view('visible'))
		await flush()

		expect(probe.engines.length).toBeGreaterThan(1)
		expect(probe.values()).toEqual(['a', 'b', 'c'])

		act(() => rowOf('C').click())

		expect(selection()).toEqual(['false', 'false', 'true'])
	})
})

describe('сервер', () => {
	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
		{ value: 'c', text: 'Третий' },
	]

	/** Сервер и браузер в одном процессе: рендер сервера и гидратация — одна разметка. */
	function hydrate(element: ReactElement): {
		container: HTMLElement
		onRecoverableError: ReturnType<typeof vi.fn>
	} {
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		return { container, onRecoverableError }
	}

	it('список из items сервер рисует полностью: выбранное — aria-selected', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(<ListBox items={ITEMS} value="b" />)

		const selected = [...container.querySelectorAll('.s-list-box-item .s-button')].map((row) =>
			row.getAttribute('aria-selected'),
		)

		expect(selected).toEqual(['false', 'true', 'false'])
	})

	it('список из разметки гидратируется без расхождений, выбор — после коммита', () => {
		const element = (
			<ListBox>
				<ListBox.Item value="a" text="A" />
				<ListBox.Item value="b" text="B" />
			</ListBox>
		)
		const { onRecoverableError } = hydrate(element)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])

		act(() => rowOf('B').click())

		expect(selection()).toEqual(['false', 'true'])
	})
})
