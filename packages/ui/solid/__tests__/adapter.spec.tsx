/**
 * Сборка компонента Solid и корень по `tag` — то, что общее у всех
 * компонентов адаптера.
 *
 * - Id монтирования — от `createUniqueId()`: набор строит от него `id`
 *   частей (`createId`), а не от своего счётчика процесса, который на сервере
 *   общий для всех запросов и при гидратации разошёлся бы.
 * - Компонент Solid в `tag` получает атрибуты корня и `ref` адаптера и кладёт
 *   их на свой корень, содержимое рисует внутри.
 * - Привязанный корень разметка читает аксессором (`rootElement`): узел, снятие
 *   и смена тега доходят до читающих.
 * - Состояние связки неглубокое (`createShallowState`): значение — то, что
 *   отдало ядро, без прокси стора на вложенных объектах, сигнал — на свойство.
 * - Состояние двух контекстов коллекции — один вид (`joinState`), и он идёт за
 *   обоими состояниями, в том числе за свойством, которого к сборке не было.
 */

import { describe, it, expect, vi, onTestFinished } from 'vitest'
import { $PROXY, Show, createRenderEffect, createRoot, type Accessor, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { TComponentView } from '@soldy-ui/core'
import { TPluginBundle } from '@soldy-ui/plugins'
import {
	Button,
	createShallowState,
	isTagComponent,
	joinState,
	roleIcon,
	rootTag,
	setupComponentView,
	type ComponentViewProps,
} from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

/** Набор кнопки — из `onBundleCreate`, на микрозадаче после сборки. */
async function bundleOf(): Promise<TPluginBundle> {
	const bundles: TPluginBundle[] = []

	mount(() => (
		<Button
			onBundleCreate={(bundle: unknown) => {
				if (bundle instanceof TPluginBundle) bundles.push(bundle)
			}}
		/>
	))
	await Promise.resolve()

	const [bundle] = bundles

	if (!bundle) throw new Error('набор не объявлен')

	return bundle
}

describe('id монтирования', () => {
	it('createId набора — не со своего счётчика и у двух монтирований разный', async () => {
		const first = (await bundleOf()).createId('part')
		const second = (await bundleOf()).createId('part')

		// Свой счётчик набора даёт `so-<n>`: им набор берёт, когда адаптер id
		// монтирования не передал
		expect(first).not.toMatch(/^so-\d+-part$/)
		expect(second).not.toMatch(/^so-\d+-part$/)
		expect(first).toMatch(/-part$/)
		expect(first).not.toBe(second)
	})
})

/** Ссылка приложения: атрибуты корня и `ref` — на свой `<a>`, содержимое — внутри. */
function Link(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>): JSX.Element {
	return <a href="/target" {...props} />
}

describe('компонент в tag', () => {
	it('получает атрибуты корня, ref и содержимое', async () => {
		const onElementReady = vi.fn()
		const { container } = mount(() => (
			<Button tag={Link} text="Перейти" class="app-link" onElementReady={onElementReady} />
		))

		await nextFrame()

		const link = find(container, ':scope > a', HTMLAnchorElement)

		expect([...link.classList]).toEqual(expect.arrayContaining(['so-button', 'app-link']))
		expect(link.getAttribute('href')).toBe('/target')
		expect(link.getAttribute('data-disabled')).toBe('false')
		expect(link.querySelector('.so-button__text')?.textContent).toBe('Перейти')
		expect(onElementReady).toHaveBeenCalledTimes(1)
		expect(onElementReady).toHaveBeenCalledWith(link)
	})

	/** Другого объекта Solid нарисовать не может — корня нет, как у `<component :is>` без компонента. */
	it('объект, который не компонент Solid, — корня нет', () => {
		const { container } = mount(() => <Button tag={{}} text="Нет" />)

		expect(container.children).toHaveLength(0)
	})

	it('корень по tag: строка — элемент, функция — компонент, прочий объект — ничего', () => {
		expect(rootTag('a')).toBe('a')
		expect(rootTag(Link)).toBe(Link)
		expect(rootTag(roleIcon('check'))).toBe(roleIcon('check'))
		expect(rootTag({})).toBeUndefined()
		expect(isTagComponent(Link)).toBe(true)
		expect(isTagComponent('a')).toBe(false)
		expect(isTagComponent({})).toBe(false)
	})
})

/**
 * Привязанный корень — аксессором (`rootElement`), как `rootElement` у Vue:
 * так Popover и Tooltip отдают корень якорем своей панели. Узел пишет
 * привязка корня, её очистка ставит `null`, смена тега — новый узел, и
 * читающие узнают о каждой смене.
 */
describe('аксессор привязанного корня', () => {
	type TProbeProps = ComponentViewProps & {
		/** Аксессор корня — тесту, при сборке. */
		onRootElement: (root: Accessor<Element | null>) => void
	}

	/** Корень по `tag`, как у ComponentView; аксессор привязанного корня — наружу. */
	function RootProbe(props: TProbeProps): JSX.Element {
		const binding = setupComponentView(props)

		props.onRootElement(binding.rootElement)

		return (
			<Show when={binding.state.rendered}>
				<Dynamic component={rootTag(binding.state.tag)} ref={binding.ref} />
			</Show>
		)
	}

	/** Смонтировать пробу; аксессор и то, что видел читающий его эффект. */
	function probe(ctrl: TComponentView, ref?: (node: Element) => void) {
		const roots: Array<Accessor<Element | null>> = []
		const mounted = mount(() => (
			<RootProbe ctrl={ctrl} ref={ref} onRootElement={(root) => roots.push(root)} />
		))
		const [root] = roots

		if (!root) throw new Error('аксессор корня не отдан')

		const seen: Array<Element | null> = []

		createRoot((dispose) => {
			createRenderEffect(() => seen.push(root()))

			onTestFinished(dispose)
		})

		return { ...mounted, rootElement: root, seen }
	}

	it('отдаёт узел, который получил ref', () => {
		const nodes: Element[] = []
		const { container, rootElement } = probe(new TComponentView(), (node) => nodes.push(node))
		const root = find(container, ':scope > *', HTMLElement)

		expect(rootElement()).toBe(root)
		expect(nodes).toEqual([root])
	})

	it('смена tag — новый узел, и читающий его видит', () => {
		const ctrl = new TComponentView()
		const { container, rootElement, seen } = probe(ctrl)
		const first = rootElement()

		ctrl.tag = 'section'

		const next = find(container, ':scope > section', HTMLElement)

		expect(rootElement()).toBe(next)
		expect(next).not.toBe(first)
		expect(seen.at(-1)).toBe(next)
	})

	it('корень снят — null, отрисован снова — новый узел', () => {
		const ctrl = new TComponentView()
		const { container, rootElement, seen } = probe(ctrl)

		ctrl.rendered = false

		expect(rootElement()).toBeNull()
		expect(seen.at(-1)).toBeNull()

		ctrl.rendered = true

		expect(rootElement()).toBe(find(container, ':scope > *', HTMLElement))
	})

	it('после снятия компонента — null', () => {
		const { rootElement, destroy } = probe(new TComponentView())

		destroy()

		expect(rootElement()).toBeNull()
	})
})

/** Значения, которые увидел эффект, читающий `key` состояния; эффект снимается с тестом. */
function watch(key: string, state: Readonly<Record<string, unknown>>): unknown[] {
	const seen: unknown[] = []

	createRoot((dispose) => {
		createRenderEffect(() => {
			seen.push(state[key])
		})

		onTestFinished(dispose)
	})

	return seen
}

/**
 * Состояние связки — сигнал на свойство, значение как есть. Ядро отдаёт
 * значения, сменившееся — новым объектом, и стор Solid, который оборачивал
 * каждый вложенный объект в прокси с сигналом на прочитанное свойство, держал
 * в таблице около двух десятков сигналов на ячейку (benchmarks/table_solid.md,
 * «Solid, состояние без стора»).
 */
describe('состояние связки', () => {
	type TProbeProps = ComponentViewProps & {
		/** Состояние связки — тесту, при сборке. */
		onState: (state: Readonly<Record<string, unknown>>) => void
	}

	function StateProbe(props: TProbeProps): JSX.Element {
		const binding = setupComponentView(props)

		props.onState(binding.state)

		return <Dynamic component={rootTag(binding.state.tag)} ref={binding.ref} />
	}

	it('вложенное значение компонента — не прокси стора', () => {
		const states: Array<Readonly<Record<string, unknown>>> = []

		mount(() => <StateProbe ctrl={new TComponentView()} onState={(s) => states.push(s)} />)

		const classes = states[0]?.classes

		expect(Array.isArray(classes)).toBe(true)
		expect(Array.isArray(classes) && $PROXY in classes).toBe(false)
	})

	it('отдаёт записанный объект тем же, вложенные объекты — без обёртки', () => {
		const [state, write] = createShallowState()
		const cells = [{ text: 'a', aria: { role: 'cell' } }]

		write('cells', cells)

		expect(state.cells).toBe(cells)
		expect($PROXY in cells[0]).toBe(false)
		expect($PROXY in cells[0].aria).toBe(false)
	})

	it('читающий свойство идёт за ним, функцию значением не зовёт', () => {
		const [state, write] = createShallowState()
		const seen = watch('handler', state)
		const handler = vi.fn()

		write('handler', handler)
		write('handler', handler)

		expect(seen).toEqual([undefined, handler])
		expect(handler).not.toHaveBeenCalled()
	})

	it('свойство со значением undefined — незаданное', () => {
		const [state, write] = createShallowState()

		write('closable', true)

		expect('closable' in state).toBe(true)

		write('closable', undefined)

		expect('closable' in state).toBe(false)
	})
})

/**
 * Вид двух состояний — своего и фасада. Свойства, которое ещё не задано, в
 * состоянии нет (`in` его не видит), и вид геттерами по ключам, собранный при
 * сборке, не увидел бы свойства, которое появилось позже (`closable` таба, имя
 * из `aria_label`).
 */
describe('joinState', () => {
	it('свойство, которого к сборке не было, вид видит, когда оно появилось', () => {
		const [own, writeOwn] = createShallowState()
		const [facade, writeFacade] = createShallowState()

		writeOwn('own', 'a')

		const seen = watch('facade', joinState(own, facade))

		writeFacade('facade', 'b')

		expect(seen).toEqual([undefined, 'b'])
	})

	it('верхнее перекрывает нижнее, снятое верхнее — снова нижнее', () => {
		const [below, writeBelow] = createShallowState()
		const [above, writeAbove] = createShallowState()

		writeBelow('shared', 'снизу')

		const seen = watch('shared', joinState(below, above))

		writeAbove('shared', 'сверху')
		writeAbove('shared', undefined)

		expect(seen).toEqual(['снизу', 'сверху', 'снизу'])
	})
})
