/**
 * Tabs и Accordion в React: пересборка владельца, сервер и гидратация.
 *
 * Механика та же, что у ListBox (`list-box-elevator.spec.tsx`): элемент
 * разметки входит в коллекцию при коммите, а пересобранный владелец
 * (StrictMode, `<Activity>`) держит тот же движок, и элементы пересобираются
 * вслед за ним. В движке остаются ровно элементы разметки, по одному разу и в
 * порядке DOM, и клик работает с ним: активирует таб вместе с его панелью,
 * раскрывает секцию.
 *
 * Своё у Tabs — панель. Таб из данных связка находит уже в сборке, поэтому
 * сервер рисует панель активного таба с её стороной ARIA-связки. Табы разметки
 * сервер рисует без того, что пишет коллекция, а панель находит их после
 * коммита — гидратация сходится, панель появляется следом.
 *
 * `engine` снаружи здесь не передаётся: готовый движок у пересобранного
 * владельца — `engine-owner.spec.tsx`.
 */

import { describe, it, expect, vi } from 'vitest'
import { Activity, StrictMode, act, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { Accordion, Tabs } from '@soldy-ui/react'
import { mount, track } from './mount'

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
		engines,
	}
}

/** Микрозадачи: `engine:create` движок объявляет на них. */
async function flush(): Promise<void> {
	await act(async () => {})
}

const tabs = () => [...document.querySelectorAll('[role="tab"]')]

function tab(text: string): HTMLElement {
	const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

	return found
}

const selection = () => tabs().map((row) => row.getAttribute('aria-selected'))

const panels = () =>
	[...document.querySelectorAll('.s-tabs__panel')].map((panel) => panel.textContent)

const headers = () => [...document.querySelectorAll('.s-accordion-item__header')]

function header(text: string): HTMLElement {
	const found = headers().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

	return found
}

const expanded = () => headers().map((node) => node.getAttribute('aria-expanded'))

type TProbeProps = { onEngineCreate?: (engine: TEngineView) => void }

/** Табы и их панели из разметки. */
function TabSet(probe: TProbeProps): ReactNode {
	return (
		<Tabs
			{...probe}
			content={['a', 'b', 'c'].map((value) => (
				<Tabs.Content key={value} value={value}>
					{`Панель ${value.toUpperCase()}`}
				</Tabs.Content>
			))}
		>
			<Tabs.Item value="a" text="A" active />
			<Tabs.Item value="b" text="B" />
			<Tabs.Item value="c" text="C" />
		</Tabs>
	)
}

/** Секции из разметки. */
function Sections(probe: TProbeProps): ReactNode {
	return (
		<Accordion {...probe}>
			<Accordion.Item value="a" text="A" selected>
				Содержимое A
			</Accordion.Item>
			<Accordion.Item value="b" text="B">
				Содержимое B
			</Accordion.Item>
			<Accordion.Item value="c" text="C">
				Содержимое C
			</Accordion.Item>
		</Accordion>
	)
}

describe('пересборка набора табов', () => {
	it('StrictMode: в живом движке ровно табы разметки; клик активирует таб и его панель', async () => {
		const probe = engineProbe()

		mount(
			<StrictMode>
				<TabSet onEngineCreate={probe.onEngineCreate} />
			</StrictMode>,
		)
		await flush()

		expect(probe.values()).toEqual(['a', 'b', 'c'])
		expect(tabs()).toHaveLength(3)
		expect(panels()).toEqual(['Панель A'])

		act(() => tab('B').click())

		expect(selection()).toEqual(['false', 'true', 'false'])
		expect(panels()).toEqual(['Панель B'])
	})

	it('<Activity>: после показа в живом движке ровно табы разметки; клик переключает панель', async () => {
		const probe = engineProbe()
		const view = (mode: 'visible' | 'hidden') => (
			<Activity mode={mode}>
				<TabSet onEngineCreate={probe.onEngineCreate} />
			</Activity>
		)
		const { render } = mount(view('visible'))

		await flush()

		render(view('hidden'))
		render(view('visible'))
		await flush()

		// Движок тот же: фасад пережил пересборку
		expect(probe.engines.length).toBe(1)
		expect(probe.values()).toEqual(['a', 'b', 'c'])

		act(() => tab('C').click())

		expect(selection()).toEqual(['false', 'false', 'true'])
		expect(panels()).toEqual(['Панель C'])
	})
})

describe('пересборка аккордеона', () => {
	it('StrictMode: в живом движке ровно секции разметки; клик раскрывает секцию', async () => {
		const probe = engineProbe()

		mount(
			<StrictMode>
				<Sections onEngineCreate={probe.onEngineCreate} />
			</StrictMode>,
		)
		await flush()

		expect(probe.values()).toEqual(['a', 'b', 'c'])
		expect(expanded()).toEqual(['true', 'false', 'false'])

		act(() => header('B').click())

		expect(expanded()).toEqual(['false', 'true', 'false'])
	})

	it('<Activity>: после показа в живом движке ровно секции разметки; клик раскрывает', async () => {
		const probe = engineProbe()
		const view = (mode: 'visible' | 'hidden') => (
			<Activity mode={mode}>
				<Sections onEngineCreate={probe.onEngineCreate} />
			</Activity>
		)
		const { render } = mount(view('visible'))

		await flush()

		render(view('hidden'))
		render(view('visible'))
		await flush()

		// Движок тот же: фасад пережил пересборку
		expect(probe.engines.length).toBe(1)
		expect(probe.values()).toEqual(['a', 'b', 'c'])

		act(() => header('C').click())

		expect(expanded()).toEqual(['false', 'false', 'true'])
	})
})

describe('сервер', () => {
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

	/** Разметка сервера в отдельном узле документа, без гидратации. */
	function serverMarkup(element: ReactElement): HTMLElement {
		const container = document.createElement('div')

		container.innerHTML = renderToString(element)

		return container
	}

	it('табы из items: aria-selected, связка таба с панелью и панель активного таба', () => {
		const container = serverMarkup(
			<Tabs
				items={[
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', _: { active: true } },
				]}
				content={
					<>
						<Tabs.Content value="a">Панель A</Tabs.Content>
						<Tabs.Content value="b">Панель B</Tabs.Content>
					</>
				}
			/>,
		)
		const rows = [...container.querySelectorAll('[role="tab"]')]
		const shown = [...container.querySelectorAll('.s-tabs__panel')]

		expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'true'])
		expect(shown.map((panel) => panel.textContent)).toEqual(['Панель B'])
		expect(rows[1].getAttribute('aria-controls')).toBe(shown[0].id)
		expect(shown[0].getAttribute('aria-labelledby')).toBe(rows[1].id)
		expect(shown[0].getAttribute('role')).toBe('tabpanel')
	})

	it('секции из items: aria-expanded и связка заголовка с панелью', () => {
		const container = serverMarkup(
			<Accordion
				items={[
					{ value: 'a', text: 'A', _: { selected: true } },
					{ value: 'b', text: 'B' },
				]}
			/>,
		)
		const heads = [...container.querySelectorAll('.s-accordion-item__header')]
		const bodies = [...container.querySelectorAll('.s-accordion-item__content')]

		expect(heads.map((node) => node.getAttribute('aria-expanded'))).toEqual(['true', 'false'])
		expect(heads.map((node) => node.getAttribute('aria-controls'))).toEqual(
			bodies.map((node) => node.id),
		)
		expect(bodies.map((node) => node.getAttribute('aria-labelledby'))).toEqual(
			heads.map((node) => node.id),
		)
	})

	it('табы и панели из разметки гидратируются без расхождений, панель — после коммита', () => {
		const element = (
			<Tabs content={<Tabs.Content value="b">Панель B</Tabs.Content>}>
				<Tabs.Item value="a" text="A" />
				<Tabs.Item value="b" text="B" active />
			</Tabs>
		)

		// Табы разметки входят в коллекцию при коммите: сервер панели не рисует
		expect(serverMarkup(element).querySelector('.s-tabs__panel')).toBeNull()

		const { onRecoverableError } = hydrate(element)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(panels()).toEqual(['Панель B'])
		expect(selection()).toEqual(['false', 'true'])

		act(() => tab('A').click())

		expect(selection()).toEqual(['true', 'false'])
		expect(panels()).toEqual([])
	})

	it('секции из разметки гидратируются без расхождений, раскрытость — после коммита', () => {
		const element = (
			<Accordion>
				<Accordion.Item value="a" text="A" selected>
					Содержимое A
				</Accordion.Item>
				<Accordion.Item value="b" text="B">
					Содержимое B
				</Accordion.Item>
			</Accordion>
		)
		const { onRecoverableError } = hydrate(element)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(expanded()).toEqual(['true', 'false'])

		// Режим по умолчанию — одна раскрытая секция
		act(() => header('B').click())

		expect(expanded()).toEqual(['false', 'true'])
	})
})
