/**
 * useAdapterContext — держит adapter-context между рендерами (869f1vnx4) и
 * отвечает за весь срок его жизни (869f43ff7).
 *
 * Раньше каждый setup.component.ts держал свой `useRef` — проводка
 * дублировалась в пяти компонентах. Хук общий, и фабрика вызывается один раз
 * за жизнь компонента, а не на каждый рендер.
 *
 * Уничтожал контекст `useAdapter` в очистке эффекта, а React заново
 * устанавливает эффекты того же компонента: StrictMode — лишним циклом при
 * монтировании, `<Activity>` — при показе. Компонент оставался с тем же
 * контекстом и уничтоженным набором плагинов: узел не привязан, `ready`,
 * нажатия и фокус не приходят. Теперь контекст уничтожает сам хук, а на
 * повторной установке собирает новый фабрикой последнего рендера.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { Activity, StrictMode, act, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TButton } from '@soldy/core'
import { TElementPlugin, TPluginBundle } from '@soldy/plugins'
import { ButtonDescriptor, createAdapterContext } from '@soldy/setup'
import type { IAdapterContext } from '@soldy/setup'
import { useAdapterContext, Button, type ButtonProps } from '@soldy/ui-react'

const roots: Root[] = []

/** Монтирование и перерисовка тем же корнем — так родитель меняет пропсы. */
function mountRoot(element: ReactElement): {
	target: HTMLElement
	render: (next: ReactElement) => void
	unmount: () => void
} {
	const target = document.createElement('div')

	document.body.appendChild(target)

	const reactRoot = createRoot(target)

	roots.push(reactRoot)

	const render = (next: ReactElement) => {
		act(() => {
			reactRoot.render(next)
		})
	}

	const unmount = () => {
		roots.splice(roots.indexOf(reactRoot), 1)
		act(() => reactRoot.unmount())
	}

	render(element)

	return { target, render, unmount }
}

function mount(element: ReactElement): HTMLElement {
	return mountRoot(element).target
}

afterEach(() => {
	// С конца — в порядке, обратном монтированию
	for (const reactRoot of roots.splice(0).reverse()) {
		act(() => reactRoot.unmount())
	}

	document.body.innerHTML = ''
})

/**
 * Кадр: `TElementPlugin` объявляет узел через `requestAnimationFrame`, а
 * `bundle:create` приходит на микрозадаче. Ожидание — внутри `act`: `ready`
 * меняет состояние компонента.
 */
async function nextFrame(): Promise<void> {
	await act(async () => {
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
	})
}

function buttonOf(target: HTMLElement): HTMLButtonElement {
	const button = target.querySelector('button')

	if (!button) throw new Error('кнопка не отрисована')

	return button
}

/** Клик по первой кнопке внутри цели. */
function clickButton(target: HTMLElement) {
	buttonOf(target).dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

const textOf = (target: HTMLElement) => target.querySelector('.s-button__text')?.textContent

/** Последний набор из `onBundleCreate`: аргумент события ядро не типизирует. */
function lastBundle(bundles: readonly unknown[]): TPluginBundle {
	const bundle = bundles.at(-1)

	if (!(bundle instanceof TPluginBundle)) throw new Error('набор не объявлен')

	return bundle
}

/** Инстанс, которому принадлежит набор: без `ctrl` его собирает контекст. */
function instanceOf(bundle: TPluginBundle): TButton {
	const instance = bundle.getInstance()

	if (!(instance instanceof TButton)) throw new Error('набор не принадлежит кнопке')

	return instance
}

/** Пропсы Button, по которым видно, что плагины набора живы. */
function probeProps() {
	const bundles: unknown[] = []
	const onElementReady = vi.fn()
	const onActionPress = vi.fn()

	return {
		bundles,
		onElementReady,
		onActionPress,
		props: {
			onBundleCreate: (bundle: unknown) => bundles.push(bundle),
			onElementReady,
			onActionPress,
		} satisfies ButtonProps,
	}
}

/**
 * Пробник: компонент, который берёт контекст у `useAdapterContext` и ничего не
 * рисует. Каждый собранный контекст и число его уничтожений видны снаружи.
 */
function createProbe() {
	const created: IAdapterContext[] = []
	const destroyed = new Map<IAdapterContext, number>()
	const rendered: IAdapterContext[] = []

	function Probe() {
		const adapter = useAdapterContext(() => {
			const context = createAdapterContext(ButtonDescriptor(), { props: {} })

			created.push(context)
			context.events.on('destroy', () =>
				destroyed.set(context, (destroyed.get(context) ?? 0) + 1),
			)

			return context
		})

		rendered.push(adapter)

		return null
	}

	return { Probe, created, destroyed, rendered }
}

describe('useAdapterContext', () => {
	it('вызывает фабрику один раз, а на повторных рендерах отдаёт тот же объект', () => {
		// Контекст хук уничтожает сам — заглушке нужен destroy
		const factory = vi.fn(() => ({ marker: Symbol('adapter-context'), destroy: vi.fn() }))
		const seen: unknown[] = []

		function Probe({ n }: { n: number }) {
			const adapter = useAdapterContext(factory)

			seen.push(adapter)

			return <span>{n}</span>
		}

		function Harness() {
			const [n, setN] = useState(0)

			return (
				<div>
					<Probe n={n} />
					<button onClick={() => setN((v) => v + 1)}>next</button>
				</div>
			)
		}

		const target = mount(<Harness />)

		act(() => clickButton(target))
		act(() => clickButton(target))

		expect(factory).toHaveBeenCalledTimes(1)
		expect(seen.length).toBe(3)
		expect(new Set(seen).size).toBe(1)
	})

	it('без повторной установки эффектов контекст один и уничтожается при размонтировании', () => {
		const { Probe, created, destroyed } = createProbe()
		const { unmount } = mountRoot(<Probe />)

		expect(created).toHaveLength(1)
		expect(destroyed.size).toBe(0)

		unmount()

		expect(destroyed.get(created[0])).toBe(1)
	})

	it('StrictMode: каждый контекст уничтожен ровно один раз — первый сразу, живой при размонтировании', () => {
		const { Probe, created, destroyed, rendered } = createProbe()
		const { unmount } = mountRoot(
			<StrictMode>
				<Probe />
			</StrictMode>,
		)

		// Лишний цикл эффектов уничтожил первый контекст — хук собрал второй
		// и перерисовал компонент с ним
		expect(created).toHaveLength(2)
		expect(destroyed.get(created[0])).toBe(1)
		expect(destroyed.has(created[1])).toBe(false)
		expect(rendered.at(-1)).toBe(created[1])

		unmount()

		expect(destroyed.get(created[0])).toBe(1)
		expect(destroyed.get(created[1])).toBe(1)
	})

	it('StrictMode: размонтированный до перерисовки с новым контекстом уничтожает и его', () => {
		const { Probe, created, destroyed, rendered } = createProbe()

		// Эффект родителя убирает пробник: перерисовка с новым контекстом до
		// пробника уже не доходит
		function Parent() {
			const [shown, setShown] = useState(true)

			useEffect(() => setShown(false), [])

			return shown ? <Probe /> : null
		}

		mount(
			<StrictMode>
				<Parent />
			</StrictMode>,
		)

		expect(created).toHaveLength(2)
		expect(rendered).not.toContain(created[1])
		expect(destroyed.get(created[0])).toBe(1)
		expect(destroyed.get(created[1])).toBe(1)
	})
})

describe('повторная установка эффектов · StrictMode', () => {
	it('плагины набора живы: узел привязан, ready приходит, клик даёт press', async () => {
		const { bundles, onElementReady, onActionPress, props } = probeProps()
		const target = mount(
			<StrictMode>
				<Button text="Strict" {...props} />
			</StrictMode>,
		)

		await nextFrame()

		const button = buttonOf(target)

		expect(textOf(target)).toBe('Strict')
		expect(onElementReady).toHaveBeenCalledTimes(1)
		expect(onElementReady).toHaveBeenCalledWith(button)
		expect(lastBundle(bundles).get(TElementPlugin)?.element).toBe(button)

		clickButton(target)

		expect(onActionPress).toHaveBeenCalledTimes(1)
	})

	it('с ctrl: текст, записанный кодом при монтировании, не откатывается к разметке', async () => {
		const ctrl = new TButton()
		const onElementReady = vi.fn()

		// Эффект родителя идёт после эффектов связки: без StrictMode разметка
		// уже записана, и код её перекрывает
		function Parent() {
			useEffect(() => {
				ctrl.text = 'из кода'
			}, [])

			return <Button ctrl={ctrl} text="из разметки" onElementReady={onElementReady} />
		}

		const target = mount(
			<StrictMode>
				<Parent />
			</StrictMode>,
		)

		await nextFrame()

		expect(ctrl.text).toBe('из кода')
		expect(textOf(target)).toBe('из кода')
		expect(onElementReady).toHaveBeenCalledWith(buttonOf(target))
	})

	it('с ctrl: onBundleCreate приходит один раз и с живым набором', async () => {
		// Шина у обоих контекстов одна — инстанс, а первый уничтожен лишним
		// циклом эффектов раньше, чем его набор объявлен
		const ctrl = new TButton()
		const { bundles, props } = probeProps()
		const target = mount(
			<StrictMode>
				<Button ctrl={ctrl} text="Strict" {...props} />
			</StrictMode>,
		)

		await nextFrame()

		expect(bundles).toHaveLength(1)

		const bundle = lastBundle(bundles)

		expect(bundle.destroyed).toBe(false)
		expect(instanceOf(bundle)).toBe(ctrl)
		expect(bundle.get(TElementPlugin)?.element).toBe(buttonOf(target))
	})
})

describe('повторная установка эффектов · <Activity>', () => {
	it('после показа плагины снова работают', async () => {
		const { bundles, onElementReady, onActionPress, props } = probeProps()
		const view = (mode: 'visible' | 'hidden') => (
			<Activity mode={mode}>
				<Button text="a" {...props} />
			</Activity>
		)
		const { target, render } = mountRoot(view('visible'))

		await nextFrame()

		render(view('hidden'))
		render(view('visible'))

		await nextFrame()

		const button = buttonOf(target)

		expect(onElementReady).toHaveBeenCalledTimes(2)
		expect(onElementReady).toHaveBeenLastCalledWith(button)
		expect(lastBundle(bundles).get(TElementPlugin)?.element).toBe(button)

		clickButton(target)

		// Набор скрытого контекста уничтожен и слушателей на узле не оставил
		expect(onActionPress).toHaveBeenCalledTimes(1)
	})

	it('без ctrl после показа инстанс новый, и состояние берётся у него', async () => {
		const { bundles, props } = probeProps()
		const view = (mode: 'visible' | 'hidden') => (
			<Activity mode={mode}>
				<Button text="из разметки" {...props} />
			</Activity>
		)
		const { target, render } = mountRoot(view('visible'))

		await nextFrame()

		const first = instanceOf(lastBundle(bundles))

		act(() => {
			first.text = 'из кода'
		})

		expect(textOf(target)).toBe('из кода')

		render(view('hidden'))
		render(view('visible'))

		await nextFrame()

		const second = instanceOf(lastBundle(bundles))

		// Как при новом монтировании: состояние, не заданное пропсами, не переносится
		expect(second).not.toBe(first)
		expect(second.text).toBe('из разметки')
		expect(textOf(target)).toBe('из разметки')
	})

	it('проп, сменённый пока компонент скрыт, после показа приходит новым', () => {
		const view = (mode: 'visible' | 'hidden', text: string) => (
			<Activity mode={mode}>
				<Button text={text} />
			</Activity>
		)
		const { target, render } = mountRoot(view('visible', 'a'))

		render(view('hidden', 'a'))
		render(view('hidden', 'b'))
		render(view('visible', 'b'))

		expect(textOf(target)).toBe('b')
	})

	it('проп, снятый пока компонент скрыт, после показа не возвращается', () => {
		// Новый контекст собирает фабрика последнего рендера: фабрика первого
		// вернула бы снятый текст, а связка его уже не перепишет — в её памяти
		// проп снят
		const view = (mode: 'visible' | 'hidden', props: ButtonProps) => (
			<Activity mode={mode}>
				<Button {...props} />
			</Activity>
		)
		const { target, render } = mountRoot(view('visible', { text: 'a' }))

		render(view('hidden', { text: 'a' }))
		render(view('hidden', {}))
		render(view('visible', {}))

		expect(textOf(target)).toBe('')
	})

	it('проп, сменённый до скрытия, после показа не откатывается к первому рендеру', () => {
		const view = (mode: 'visible' | 'hidden', text: string) => (
			<Activity mode={mode}>
				<Button text={text} />
			</Activity>
		)
		const { target, render } = mountRoot(view('visible', 'a'))

		render(view('visible', 'b'))
		render(view('hidden', 'b'))
		render(view('visible', 'b'))

		expect(textOf(target)).toBe('b')
	})

	it('с ctrl: показ — новое монтирование, разметка снова ложится в инстанс', () => {
		const ctrl = new TButton()
		const view = (mode: 'visible' | 'hidden') => (
			<Activity mode={mode}>
				<Button ctrl={ctrl} text="из разметки" />
			</Activity>
		)
		const { target, render } = mountRoot(view('visible'))

		act(() => {
			ctrl.text = 'из кода'
		})

		render(view('hidden'))
		render(view('visible'))

		// Пересобранный контекст применяет пропсы, как любая сборка
		expect(ctrl.text).toBe('из разметки')
		expect(textOf(target)).toBe('из разметки')
	})
})
