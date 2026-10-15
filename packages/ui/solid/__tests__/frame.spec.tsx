/**
 * Frame в Solid: слой поверх страницы.
 *
 * Корень уходит телепортом в цель (`body` по умолчанию) — как `<teleport>` у
 * Vue и портал у React, — и на нём сходится всё: наборы ядра, раскладка
 * плагина (`position`, координаты, `z-index` слоя) и атрибуты потребителя.
 * Номер слоя один на два места — `z-index` и `data-layer`, по нему плагины
 * оверлея узнают вложенность.
 *
 * Телепорт стоит на `Portal` Solid, а тот кладёт в цель свою обёртку и рисует
 * содержимое в ней. Поэтому место узла проверяется тем, в какой цели он
 * лежит (`contains`), а не его родителем.
 *
 * Сценарии — те же, что у React (`frame.spec.tsx`), без гидратации: в одном
 * прогоне компоненты собраны под одно окружение. Серверный рендер —
 * `ssr.server.spec.tsx`.
 */

import { describe, it, expect } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import { TFrame } from '@soldy-ui/core'
import { TPluginBundle, ruRU } from '@soldy-ui/plugins'
import { Button, Frame, LocaleProvider } from '@soldy-ui/solid'
import { find, mount } from './mount'

/** Узел Frame — там, куда его увёл телепорт. */
const frame = () => find(document, '.so-frame', HTMLElement)

describe('Frame · телепорт', () => {
	it('узел — в body, а не в контейнере компонента', () => {
		const { container } = mount(() => <Frame visible>Панель</Frame>)

		expect(document.body.contains(frame())).toBe(true)
		expect(container.contains(frame())).toBe(false)
		expect(frame().textContent).toBe('Панель')
	})

	it('target уводит узел в свою цель, смена target — в новую тем же узлом', () => {
		const first = document.createElement('section')
		const second = document.createElement('section')

		first.id = 'first'
		second.id = 'second'
		document.body.append(first, second)

		const [target, setTarget] = createSignal('#first')

		mount(() => <Frame target={target()} visible />)

		const node = frame()

		expect(first.contains(node)).toBe(true)

		setTarget('#second')

		expect(second.contains(frame())).toBe(true)
		expect(frame()).toBe(node)
		expect(first.children).toHaveLength(0)
	})

	it('contained — без телепорта: узел на месте, в контейнере компонента', () => {
		const { container } = mount(() => (
			<Frame contained visible>
				Панель
			</Frame>
		))

		expect(frame().parentElement).toBe(container)
		expect(frame().dataset.contained).toBe('true')
		expect(frame().style.position).toBe('absolute')
		expect(frame().style.left).toBe('')
	})

	it('contained на лету: узел возвращается на место и уходит обратно', () => {
		const [contained, setContained] = createSignal(false)
		const { container } = mount(() => <Frame contained={contained()} visible />)

		expect(container.contains(frame())).toBe(false)

		setContained(true)

		expect(frame().parentElement).toBe(container)
		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)

		setContained(false)

		expect(container.contains(frame())).toBe(false)
		expect(document.body.contains(frame())).toBe(true)
		expect(document.querySelectorAll('.so-frame')).toHaveLength(1)
	})

	it('цели нет — узла нет', () => {
		mount(() => <Frame target="#missing" visible />)

		expect(document.querySelector('.so-frame')).toBeNull()
	})

	it('размонтирование убирает узел из цели', () => {
		const { destroy } = mount(() => <Frame visible />)

		expect(document.querySelector('.so-frame')).not.toBeNull()

		destroy()

		expect(document.querySelector('.so-frame')).toBeNull()
	})

	/**
	 * Портал Solid рисует содержимое под владельцем места, где стоит Frame, и
	 * контексты места доходят до телепортированной панели: компонент в ней
	 * собирается с локалью провайдера вокруг Frame, а не с английской.
	 */
	it('содержимое панели — в контексте места: локаль провайдера вокруг Frame', async () => {
		const bundles: TPluginBundle[] = []

		mount(() => (
			<LocaleProvider locale={ruRU}>
				<Frame visible>
					<Button
						onBundleCreate={(bundle: unknown) => {
							if (bundle instanceof TPluginBundle) bundles.push(bundle)
						}}
					/>
				</Frame>
			</LocaleProvider>
		))
		// Набор объявляется на микрозадаче после сборки
		await Promise.resolve()

		expect(frame().querySelector('.so-button')).not.toBeNull()
		expect(bundles.map((bundle) => bundle.locale.locale.tag)).toEqual([ruRU.tag])
	})
})

describe('Frame · rendered и visible', () => {
	it('по умолчанию скрыт: узел есть, display: none', () => {
		mount(() => <Frame />)

		expect(frame().style.display).toBe('none')
	})

	it('visible показывает узел', () => {
		mount(() => <Frame visible />)

		expect(frame().style.display).toBe('')
	})

	it('rendered={false} — узла нет', () => {
		mount(() => <Frame rendered={false} visible />)

		expect(document.querySelector('.so-frame')).toBeNull()
	})

	// Открытость для темы пишет слой: по `data-open` она проявляет и гасит
	// панель переходом
	it('data-open идёт за видимостью', () => {
		const ctrl = new TFrame()

		mount(() => <Frame ctrl={ctrl} />)

		expect(frame().dataset.open).toBe('false')

		ctrl.show()

		expect(frame().dataset.open).toBe('true')

		ctrl.hide()

		expect(frame().dataset.open).toBe('false')
	})
})

describe('Frame · слой и раскладка', () => {
	it('у показанного style.zIndex равен data-layer', () => {
		mount(() => <Frame visible />)

		const layer = frame().getAttribute('data-layer')

		expect(layer).not.toBeNull()
		expect(frame().style.zIndex).toBe(layer)
	})

	it('показ через ctrl поднимает слой в обоих местах', () => {
		const ctrl = new TFrame()

		mount(() => <Frame ctrl={ctrl} />)

		ctrl.show()

		expect(frame().style.display).toBe('')
		expect(frame().style.zIndex).toBe(String(ctrl.zIndex))
		expect(frame().getAttribute('data-layer')).toBe(String(ctrl.zIndex))
	})

	it('position и координаты — из раскладки', () => {
		mount(() => <Frame visible x={10} y={20} width={300} />)

		expect(frame().style.position).toBe('fixed')
		expect(frame().style.left).toBe('10px')
		expect(frame().style.top).toBe('20px')
		expect(frame().style.width).toBe('300px')
	})
})

describe('Frame · пропсы потребителя', () => {
	it('class и data-* — на узле внутри телепорта', () => {
		mount(() => <Frame visible class="app-panel" data-testid="panel" />)

		expect(frame().classList.contains('so-frame')).toBe(true)
		expect(frame().classList.contains('app-panel')).toBe(true)
		expect(frame().getAttribute('data-testid')).toBe('panel')
	})

	it('style потребителя — поверх раскладки, скрытие — поверх всего', () => {
		const [visible, setVisible] = createSignal(true)
		const [style, setStyle] = createSignal<JSX.CSSProperties>({ left: '1px', color: 'red' })

		mount(() => <Frame visible={visible()} x={10} style={style()} />)

		expect(frame().style.left).toBe('1px')
		expect(frame().style.color).toBe('red')

		setVisible(false)
		setStyle({ display: 'flex' })

		expect(frame().style.display).toBe('none')
	})

	it('style потребителя строкой — тоже поверх раскладки, скрытие — поверх всего', () => {
		const [visible, setVisible] = createSignal(true)
		const [style, setStyle] = createSignal('left: 1px; color: red')

		mount(() => <Frame visible={visible()} x={10} style={style()} />)

		expect(frame().style.left).toBe('1px')
		expect(frame().style.color).toBe('red')

		setVisible(false)
		setStyle('display: flex')

		expect(frame().style.display).toBe('none')
	})
})
