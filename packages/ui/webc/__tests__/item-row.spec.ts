/**
 * Строка элемента коллекции — `<div is="so-item-row-div">` и
 * `<span is="so-item-row-span">`: кнопка с шаблоном Button под своим именем
 * (одно имя элемента расширяет один тег). Регистрирует её фабрика
 * `registerItemRowTag`: описание элемента — дескриптор, шаблон, setup — у
 * тегов одно, и тег ядро получает от элемента. Своих роли и остановки Tab у
 * строки нет ни на каком теге (`TItemRow`) — их кладёт набор элемента, как в
 * `list-box.spec.ts`, `select.spec.ts`, `tags.spec.ts` и `menu.spec.ts`; здесь
 * — сама строка, без элемента. `disabled` на `div` и `span` — свойство пропа:
 * своего у этих тегов нет.
 */

import { describe, it, expect, afterEach } from 'vitest'
import type { IButton } from '@soldy-ui/core'
import { TButtonElement, registerItemRowTag, type TItemRowElementProps } from '@soldy-ui/webc'

/** Микрозадача: обновления состояния элемент разносит по ним. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Кадр: узел `TElementPlugin` объявляет через `requestAnimationFrame`. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const TItemRowDivElement = registerItemRowTag('div')
const TItemRowSpanElement = registerItemRowTag('span')

function isRowDiv(node: Element | null): node is TItemRowElementProps<HTMLDivElement> {
	return node instanceof TItemRowDivElement
}

/** Строка на `div` из разметки. */
function mountDiv(html: string): TItemRowElementProps<HTMLDivElement> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.firstElementChild

	if (!isRowDiv(node)) throw new Error('<div is="so-item-row-div"> нет')

	return node
}

/** Инстанс элемента; его нет — тест падает здесь, а не на чтении свойства. */
function ctrlOf(el: Pick<TItemRowElementProps<HTMLDivElement>, 'ctrl'>): IButton {
	const { ctrl } = el

	if (!ctrl) throw new Error('у строки нет инстанса')

	return ctrl
}

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Тексты детей строки — так видны слоты и их порядок. */
const children = (el: Element) => Array.from(el.children).map((node) => node.textContent)

afterEach(() => {
	document.body.innerHTML = ''
})

describe('строка элемента коллекции · so-item-row-div и so-item-row-span', () => {
	it('класс у тега один: повторный вызов отдаёт его же, имя — тег через дефис', () => {
		expect(registerItemRowTag('div')).toBe(TItemRowDivElement)
		expect(registerItemRowTag('span')).toBe(TItemRowSpanElement)
		expect(customElements.get('so-item-row-div')).toBe(TItemRowDivElement)
		expect(customElements.get('so-item-row-span')).toBe(TItemRowSpanElement)
		expect(document.createElement('div', { is: 'so-item-row-div' })).toBeInstanceOf(
			TItemRowDivElement,
		)
	})

	it('атрибуты-входы — те же, что у <button is="so-button">', () => {
		expect(TItemRowDivElement.observedAttributes).toEqual(TButtonElement.observedAttributes)
	})

	it('div с классами, текстом и слотами кнопки; роли и остановки Tab своих нет', () => {
		const el = mountDiv(
			'<div is="so-item-row-div" text="Mid" size="xl"><i slot="leading">L</i><i slot="trailing">T</i></div>',
		)

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect(el.classList).toContain('so-button')
		expect(el.classList).toContain('so-button--size-xl')
		expect(children(el)).toEqual(['L', 'Mid', 'T'])
		expect(ctrlOf(el).tag).toBe('div')
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
	})

	it('disabled — свойство пропа: aria-disabled без disabled', async () => {
		const el = mountDiv('<div is="so-item-row-div" text="A"></div>')

		expect(
			Object.getOwnPropertyDescriptor(TItemRowDivElement.prototype, 'disabled')?.set,
		).toBeTypeOf('function')

		el.disabled = true
		await flush()

		expect(ctrlOf(el).disabled).toBe(true)
		expect(el.getAttribute('aria-disabled')).toBe('true')
		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('true')
	})

	it('клик даёт so:action:press, у выключенной — нет', async () => {
		const el = mountDiv('<div is="so-item-row-div" text="A"></div>')
		const presses = collect(el, 'so:action:press')

		await nextFrame()

		el.click()

		expect(presses).toHaveLength(1)

		el.disabled = true
		await flush()
		el.click()

		expect(presses).toHaveLength(1)
	})
})
