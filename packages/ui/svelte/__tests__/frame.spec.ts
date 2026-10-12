/**
 * Frame в Svelte: слой поверх страницы.
 *
 * Корень уходит телепортом в цель (`body` по умолчанию) — как `<teleport>` у
 * Vue и портал у React, — и на нём сходится всё: наборы ядра, раскладка
 * плагина (`position`, координаты, `z-index` слоя) и атрибуты потребителя.
 * Номер слоя один на два места — `z-index` и `data-layer`, по нему плагины
 * оверлея узнают вложенность.
 *
 * Сценарии — те же, что у React (`frame.spec.tsx`), и контексты места в
 * панели, как у Solid, — без гидратации: в одном прогоне компоненты собраны
 * под одно окружение. Серверный рендер — `ssr.server.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { TFrame } from '@soldy-ui/core'
import { TPluginBundle, ruRU } from '@soldy-ui/plugins'
import { Frame, type FrameProps } from '@soldy-ui/svelte'
import FrameLocale from './FrameLocale.test.svelte'
import { find, mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** Узел Frame — там, куда его увёл телепорт. */
const frame = () => find(document, '.s-frame', HTMLElement)

/** Содержимое панели. */
const content = createRawSnippet(() => ({ render: () => '<span>Панель</span>' }))

describe('Frame · телепорт', () => {
	it('узел — в body, а не в контейнере компонента', () => {
		const { container } = mount(Frame, { visible: true, children: content })

		expect(frame().parentElement).toBe(document.body)
		expect(container.contains(frame())).toBe(false)
		expect(frame().textContent).toBe('Панель')
	})

	it('target уводит узел в свою цель, смена target — в новую', () => {
		const first = document.createElement('section')
		const second = document.createElement('section')

		first.id = 'first'
		second.id = 'second'
		document.body.append(first, second)

		const props = reactiveProps<FrameProps>({ target: '#first', visible: true })

		mount(Frame, props)

		expect(frame().parentElement).toBe(first)

		props.target = '#second'
		flushSync()

		expect(frame().parentElement).toBe(second)
		expect(first.children).toHaveLength(0)
	})

	it('contained — без телепорта: узел на месте, в контейнере компонента', () => {
		const { container } = mount(Frame, { contained: true, visible: true, children: content })

		expect(frame().parentElement).toBe(container)
		expect(frame().dataset.contained).toBe('true')
		expect(frame().style.position).toBe('absolute')
		expect(frame().style.left).toBe('')
	})

	it('contained на лету: узел возвращается на место и уходит обратно', () => {
		const props = reactiveProps<FrameProps>({ visible: true })
		const { container } = mount(Frame, props)

		expect(frame().parentElement).toBe(document.body)

		props.contained = true
		flushSync()

		expect(frame().parentElement).toBe(container)
		expect(document.querySelectorAll('.s-frame')).toHaveLength(1)

		props.contained = false
		flushSync()

		expect(frame().parentElement).toBe(document.body)
		expect(document.querySelectorAll('.s-frame')).toHaveLength(1)
	})

	it('цели нет — узла нет', () => {
		mount(Frame, { target: '#missing', visible: true })

		expect(document.querySelector('.s-frame')).toBeNull()
	})

	it('размонтирование убирает узел из цели', () => {
		const { destroy } = mount(Frame, { visible: true })

		expect(document.querySelector('.s-frame')).not.toBeNull()

		destroy()

		expect(document.querySelector('.s-frame')).toBeNull()
	})

	/**
	 * Своего портала у Svelte нет: телепорт монтирует панель в цель отдельным
	 * корнем и отдаёт ему контексты места, где стоит Frame (`getAllContexts`).
	 * Компонент в панели собирается с локалью провайдера вокруг Frame, а не с
	 * английской.
	 *
	 * Сторожится поведение, а не строка: `mount` из эффекта Svelte и сам
	 * наследует контекст компонента, где эффект заведён, и без опции `context`
	 * тест сейчас тоже зелёный. Опция — объявленный путь Svelte: на это
	 * наследование телепорт не полагается.
	 */
	it('содержимое панели — в контексте места: локаль провайдера вокруг Frame', async () => {
		const bundles: TPluginBundle[] = []
		const { container } = mount(FrameLocale, {
			locale: ruRU,
			onBundleCreate: (bundle) => {
				if (bundle instanceof TPluginBundle) bundles.push(bundle)
			},
		})

		// Набор объявляется на микрозадаче после сборки
		await Promise.resolve()

		// Панель ушла из места: на месте контекст дошёл бы и без переноса
		expect(container.contains(frame())).toBe(false)
		expect(frame().querySelector('.s-button')).not.toBeNull()
		expect(bundles.map((bundle) => bundle.locale.locale.tag)).toEqual([ruRU.tag])
	})
})

describe('Frame · rendered и visible', () => {
	it('по умолчанию скрыт: узел есть, display: none', () => {
		mount(Frame, {})

		expect(frame().style.display).toBe('none')
	})

	it('visible показывает узел', () => {
		mount(Frame, { visible: true })

		expect(frame().style.display).toBe('')
	})

	it('rendered={false} — узла нет', () => {
		mount(Frame, { rendered: false, visible: true })

		expect(document.querySelector('.s-frame')).toBeNull()
	})

	// Открытость для темы пишет слой: по `data-open` она проявляет и гасит
	// панель переходом
	it('data-open идёт за видимостью', () => {
		const ctrl = new TFrame()

		mount(Frame, { ctrl })

		expect(frame().dataset.open).toBe('false')

		ctrl.show()
		flushSync()

		expect(frame().dataset.open).toBe('true')

		ctrl.hide()
		flushSync()

		expect(frame().dataset.open).toBe('false')
	})
})

describe('Frame · слой и раскладка', () => {
	it('у показанного style.zIndex равен data-layer', () => {
		mount(Frame, { visible: true })

		const layer = frame().getAttribute('data-layer')

		expect(layer).not.toBeNull()
		expect(frame().style.zIndex).toBe(layer)
	})

	it('показ через ctrl поднимает слой в обоих местах', () => {
		const ctrl = new TFrame()

		mount(Frame, { ctrl })

		ctrl.show()
		flushSync()

		expect(frame().style.display).toBe('')
		expect(frame().style.zIndex).toBe(String(ctrl.zIndex))
		expect(frame().getAttribute('data-layer')).toBe(String(ctrl.zIndex))
	})

	it('position и координаты — из раскладки', () => {
		mount(Frame, { visible: true, x: 10, y: 20, width: 300 })

		expect(frame().style.position).toBe('fixed')
		expect(frame().style.left).toBe('10px')
		expect(frame().style.top).toBe('20px')
		expect(frame().style.width).toBe('300px')
	})
})

describe('Frame · пропсы потребителя', () => {
	it('class и data-* — на узле внутри телепорта', () => {
		mount(Frame, { visible: true, class: 'app-panel', 'data-testid': 'panel' })

		expect(frame().classList.contains('s-frame')).toBe(true)
		expect(frame().classList.contains('app-panel')).toBe(true)
		expect(frame().getAttribute('data-testid')).toBe('panel')
	})

	it('style потребителя — поверх раскладки, скрытие — поверх всего', () => {
		const props = reactiveProps<FrameProps>({
			visible: true,
			x: 10,
			style: 'left: 1px; color: red',
		})

		mount(Frame, props)

		expect(frame().style.left).toBe('1px')
		expect(frame().style.color).toBe('red')

		props.visible = false
		props.style = 'display: flex'
		flushSync()

		expect(frame().style.display).toBe('none')
	})
})
