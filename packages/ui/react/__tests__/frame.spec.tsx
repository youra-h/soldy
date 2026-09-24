/**
 * Frame в React: слой поверх страницы.
 *
 * Корень уходит телепортом в цель (`body` по умолчанию) — как `<teleport>` у
 * Vue, — и на нём сходится всё: наборы ядра, раскладка плагина (`position`,
 * координаты, `z-index` слоя) и пропсы потребителя. Номер слоя один на два
 * места — `z-index` и `data-layer`, по нему плагины оверлея узнают
 * вложенность; `z-index` из раскладки React получает только в camelCase.
 *
 * Портал React серверный рендер роняет, поэтому на сервере и при гидратации
 * его нет, а после гидратации он появляется.
 */

import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TFrame } from '@soldy-ui/core'
import { Frame } from '@soldy-ui/react'
import { find, mount, track } from './mount'

/** Узел Frame — там, куда его увёл телепорт. */
const frame = () => find(document, '.s-frame', HTMLElement)

describe('Frame · телепорт', () => {
	it('узел — в body, а не в контейнере компонента', () => {
		const { container } = mount(<Frame visible>Панель</Frame>)

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

		const { render } = mount(<Frame target="#first" visible />)

		expect(frame().parentElement).toBe(first)

		render(<Frame target="#second" visible />)

		expect(frame().parentElement).toBe(second)
		expect(first.children).toHaveLength(0)
	})

	it('цели нет — узла нет', () => {
		mount(<Frame target="#missing" visible />)

		expect(document.querySelector('.s-frame')).toBeNull()
	})

	it('размонтирование убирает узел из цели', () => {
		const { render } = mount(<Frame visible />)

		render(<></>)

		expect(document.querySelector('.s-frame')).toBeNull()
	})
})

describe('Frame · rendered и visible', () => {
	it('по умолчанию скрыт: узел есть, display: none', () => {
		mount(<Frame />)

		expect(frame().style.display).toBe('none')
	})

	it('visible показывает узел', () => {
		mount(<Frame visible />)

		expect(frame().style.display).toBe('')
	})

	it('rendered={false} — узла нет', () => {
		mount(<Frame rendered={false} visible />)

		expect(document.querySelector('.s-frame')).toBeNull()
	})
})

describe('Frame · слой и раскладка', () => {
	it('у показанного style.zIndex равен data-layer', () => {
		mount(<Frame visible />)

		const layer = frame().getAttribute('data-layer')

		expect(layer).not.toBeNull()
		expect(frame().style.zIndex).toBe(layer)
	})

	it('показ через ctrl поднимает слой в обоих местах', () => {
		const ctrl = new TFrame()

		mount(<Frame ctrl={ctrl} />)

		act(() => ctrl.show())

		expect(frame().style.display).toBe('')
		expect(frame().style.zIndex).toBe(String(ctrl.zIndex))
		expect(frame().getAttribute('data-layer')).toBe(String(ctrl.zIndex))
	})

	it('position и координаты — из раскладки', () => {
		mount(<Frame visible x={10} y={20} width={300} />)

		expect(frame().style.position).toBe('fixed')
		expect(frame().style.left).toBe('10px')
		expect(frame().style.top).toBe('20px')
		expect(frame().style.width).toBe('300px')
	})
})

describe('Frame · пропсы потребителя', () => {
	it('className и data-* — на узле внутри телепорта', () => {
		mount(<Frame visible className="app-panel" data-testid="panel" />)

		expect(frame().classList.contains('s-frame')).toBe(true)
		expect(frame().classList.contains('app-panel')).toBe(true)
		expect(frame().getAttribute('data-testid')).toBe('panel')
	})

	it('style потребителя — поверх раскладки, скрытие — поверх всего', () => {
		const { render } = mount(<Frame visible x={10} style={{ left: '1px', color: 'red' }} />)

		expect(frame().style.left).toBe('1px')
		expect(frame().style.color).toBe('red')

		render(<Frame visible={false} x={10} style={{ display: 'flex' }} />)

		expect(frame().style.display).toBe('none')
	})
})

describe('Frame · серверный рендер', () => {
	it('renderToString не падает: портала на сервере нет', () => {
		expect(renderToString(<Frame visible>Панель</Frame>)).toBe('')
	})

	it('гидратация без расхождений, узел появляется после неё', () => {
		const element = <Frame visible>Панель</Frame>
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(frame().parentElement).toBe(document.body)
		expect(frame().textContent).toBe('Панель')
	})
})
