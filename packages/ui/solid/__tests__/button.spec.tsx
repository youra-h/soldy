import { describe, it, expect, afterEach, vi } from 'vitest'
import { createSignal, type ComponentProps } from 'solid-js'
import { render } from 'solid-js/web'
import { TButton } from '@soldy-ui/core'
import { TActionPlugin } from '@soldy-ui/plugins'
import { Button } from '@soldy-ui/solid'

const disposers: Array<() => void> = []

function mount(props: ComponentProps<typeof Button> = {}): HTMLElement {
	const target = document.createElement('div')
	document.body.appendChild(target)

	disposers.push(render(() => <Button {...props} />, target))

	return target
}

afterEach(() => {
	// С конца — в порядке, обратном монтированию
	for (const dispose of disposers.splice(0).reverse()) dispose()
	document.body.innerHTML = ''
})

describe('Button · декларативные props', () => {
	it('по умолчанию рендерит <button> с базовыми классами', () => {
		const el = mount().firstElementChild as HTMLElement

		expect(el.tagName.toLowerCase()).toBe('button')
		expect(el.className).toContain('s-button')
		// variant и view — значения темы: без них модификаторов нет вовсе
		expect(el.className).not.toMatch(/--(variant|view)-/)
	})

	it('отображает text и применяет классы size/variant/view', () => {
		const el = mount({ text: 'Hello', variant: 'brand', size: 'xl', view: 'ghost' })
			.firstElementChild as HTMLElement

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Hello')
		expect(el.className).toContain('s-button--size-xl')
		expect(el.className).toContain('s-button--variant-brand')
		expect(el.className).toContain('s-button--view-ghost')
	})

	it('меняет корневой тег через prop tag', () => {
		const el = mount({ tag: 'a' }).firstElementChild as HTMLElement

		expect(el.tagName.toLowerCase()).toBe('a')
	})

	it('disabled: атрибут на <button>, aria-disabled на других тегах', () => {
		const btn = mount({ disabled: true }).firstElementChild as HTMLElement
		expect(btn.hasAttribute('disabled')).toBe(true)
		expect(btn.getAttribute('data-disabled')).toBe('true')

		const link = mount({ tag: 'a', disabled: true }).firstElementChild as HTMLElement
		expect(link.getAttribute('aria-disabled')).toBe('true')
		expect(link.hasAttribute('disabled')).toBe(false)
		expect(link.getAttribute('data-disabled')).toBe('true')
	})

	it('disabled: fieldset тоже нативный тег — атрибут disabled, без aria-disabled', () => {
		const el = mount({ tag: 'fieldset', disabled: true }).firstElementChild as HTMLElement

		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('true')
	})

	/** Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не пропавший атрибут. */
	it('без disabled data-disabled="false"', () => {
		const el = mount().firstElementChild as HTMLElement

		expect(el.getAttribute('data-disabled')).toBe('false')
	})

	it('rendered=false убирает элемент, visible=false прячет', () => {
		expect(mount({ rendered: false }).firstElementChild).toBeNull()

		const hidden = mount({ visible: false }).firstElementChild as HTMLElement
		expect(hidden.style.display).toBe('none')
	})
})

/**
 * Проп сняли — он больше не задан, и связка возвращает умолчание декларации.
 * Раньше `undefined` не доезжал до ядра, и кнопка оставалась с прежним
 * значением.
 */
describe('Button · снятый проп', () => {
	it('снятый text возвращает умолчание — пустую строку', () => {
		const [text, setText] = createSignal<string | undefined>('a')
		const target = document.createElement('div')

		document.body.appendChild(target)
		disposers.push(render(() => <Button text={text()} />, target))

		const content = () => target.querySelector('.s-button__text')?.textContent

		expect(content()).toBe('a')

		setText(undefined)

		expect(content()).toBe('')
	})
})

/**
 * Родитель сменил другой проп — эффект перечитал все пропсы, но повторённый в
 * ядро не пишется. Раньше связка писала их заново: текст, сменённый через
 * инстанс, откатывался к разметке.
 */
describe('Button · перерисовка родителя', () => {
	it('text, сменённый через инстанс, переживает смену другого пропа', () => {
		const ctrl = new TButton()
		const [disabled, setDisabled] = createSignal(false)
		const target = document.createElement('div')

		document.body.appendChild(target)
		disposers.push(render(() => <Button ctrl={ctrl} text="a" disabled={disabled()} />, target))

		const el = () => target.firstElementChild as HTMLElement
		const content = () => target.querySelector('.s-button__text')?.textContent

		expect(content()).toBe('a')

		ctrl.text = 'из кода'
		setDisabled(true)

		expect(el().getAttribute('data-disabled')).toBe('true')
		expect(content()).toBe('из кода')
	})
})

describe('Button · внешний ctrl', () => {
	it('отражает состояние переданного инстанса', () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'brand', view: 'solid' })
		const el = mount({ ctrl }).firstElementChild as HTMLElement

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('FromCtrl')
		expect(el.className).toContain('s-button--variant-brand')
		expect(el.className).toContain('s-button--view-solid')
	})

	it('мутации инстанса обновляют DOM', () => {
		const ctrl = new TButton({ text: 'X' })
		const root = mount({ ctrl })

		ctrl.text = 'Y'
		ctrl.variant = 'brand'

		const el = root.firstElementChild as HTMLElement
		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Y')
		expect(el.className).toContain('s-button--variant-brand')
	})

	it('смена tag через инстанс меняет корневой элемент', () => {
		const ctrl = new TButton()
		const root = mount({ ctrl })

		expect((root.firstElementChild as HTMLElement).tagName.toLowerCase()).toBe('button')

		ctrl.tag = 'span'

		expect((root.firstElementChild as HTMLElement).tagName.toLowerCase()).toBe('span')
	})

	/** `data-disabled` для темы одно на любом теге — смена тега его не трогает. */
	it('data-disabled следует за disabled инстанса и переживает смену тега', () => {
		const ctrl = new TButton()
		const root = mount({ ctrl })
		const el = () => root.firstElementChild as HTMLElement

		ctrl.disabled = true
		expect(el().getAttribute('data-disabled')).toBe('true')

		ctrl.tag = 'span'
		expect(el().getAttribute('aria-disabled')).toBe('true')
		expect(el().getAttribute('data-disabled')).toBe('true')

		ctrl.disabled = false
		expect(el().getAttribute('data-disabled')).toBe('false')
	})
})

describe('Button · события через колбэк-пропы', () => {
	it('onChangeView отдаёт значение', () => {
		const ctrl = new TButton({ view: 'solid' })
		const seen: string[] = []

		mount({ ctrl, onChangeView: (v: string) => seen.push(v) })

		ctrl.view = 'ghost'

		expect(seen).toEqual(['ghost'])
	})

	it('onChangeVisible не дублируется (дедупликация триггеров)', () => {
		const ctrl = new TButton()
		const seen: boolean[] = []

		mount({ ctrl, onChangeVisible: (v: boolean) => seen.push(v) })

		ctrl.hide()

		expect(seen).toHaveLength(1)
	})

	it('onElementReady приходит с DOM-узлом (callback-ref сработал)', async () => {
		const ctrl = new TButton()
		let element: unknown = null

		mount({ ctrl, onElementReady: (el: unknown) => (element = el) })

		// TElementPlugin эмитит ready через requestAnimationFrame
		await new Promise((resolve) => setTimeout(resolve, 30))

		expect(element).toBeInstanceOf(HTMLElement)
	})
})

describe('Button · очистка', () => {
	it('снимает подписки с внешнего ctrl при размонтировании', () => {
		const ctrl = new TButton()
		// Подписки считаются по публичному API шины: подписались на change:text
		// минус отписались
		const on = vi.spyOn(ctrl.events, 'on')
		const off = vi.spyOn(ctrl.events, 'off')
		const count = () =>
			on.mock.calls.filter(([event]) => event === 'change:text').length -
			off.mock.calls.filter(([event]) => event === 'change:text').length

		const target = document.createElement('div')
		document.body.appendChild(target)

		const dispose = render(() => <Button ctrl={ctrl} />, target)

		expect(count()).toBeGreaterThan(0)

		dispose()

		expect(count()).toBe(0)
	})
})

describe('Button · aria и доступ к плагинам', () => {
	it('на нативной кнопке лишних атрибутов нет', () => {
		const el = mount({ disabled: true }).firstElementChild as HTMLElement

		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
	})

	it('на не-нативном теге появляются role и tabindex', () => {
		const el = mount({ tag: 'div' }).firstElementChild as HTMLElement

		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('tabindex')).toBe('0')
	})

	it('onBundleCreate отдаёт bundle, onActionCreate — сам плагин', async () => {
		const seen: Array<[string, unknown]> = []

		mount({
			onBundleCreate: (b: unknown) => seen.push(['bundle', b]),
			onActionCreate: (p: unknown) => seen.push(['action', p]),
		})

		// assembleBundle откладывает эмит на микрозадачу — см. setup/assemble/bundle.ts
		await Promise.resolve()

		expect(seen.map(([kind]) => kind)).toEqual(['bundle', 'action'])
		expect(seen[1][1]).toBeInstanceOf(TActionPlugin)
	})
})
