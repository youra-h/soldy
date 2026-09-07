import { describe, it, expect, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import { TButton } from '@soldy/core'
import { TActionPlugin } from '@soldy/plugins'
import { Button } from '@soldy/ui-svelte'

let target: HTMLElement
const mounted: any[] = []

function render(props: Record<string, any> = {}) {
	target = document.createElement('div')
	document.body.appendChild(target)

	const app = mount(Button as any, { target, props })

	mounted.push(app)
	flushSync()

	return target
}

afterEach(() => {
	while (mounted.length) unmount(mounted.pop())
	document.body.innerHTML = ''
})

describe('Button · декларативные props', () => {
	it('по умолчанию рендерит <button> с базовыми классами', () => {
		const el = render().firstElementChild as HTMLElement

		expect(el.tagName.toLowerCase()).toBe('button')
		expect(el.className).toContain('s-button')
		expect(el.className).toContain('s-button--a-filled')
	})

	it('отображает text и применяет классы size/variant/view', () => {
		const el = render({ text: 'Hello', variant: 'accent', size: 'xl', view: 'plain' })
			.firstElementChild as HTMLElement

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Hello')
		expect(el.className).toContain('s-button--size-xl')
		expect(el.className).toContain('s-button--accent')
		expect(el.className).toContain('s-button--a-plain')
	})

	it('меняет корневой тег через prop tag', () => {
		const el = render({ tag: 'a' }).firstElementChild as HTMLElement

		expect(el.tagName.toLowerCase()).toBe('a')
	})

	it('disabled: атрибут на <button>, aria-disabled на других тегах', () => {
		const btn = render({ disabled: true }).firstElementChild as HTMLElement
		expect(btn.hasAttribute('disabled')).toBe(true)

		const link = render({ tag: 'a', disabled: true }).firstElementChild as HTMLElement
		expect(link.getAttribute('aria-disabled')).toBe('true')
		expect(link.hasAttribute('disabled')).toBe(false)
	})

	it('rendered=false убирает элемент, visible=false прячет', () => {
		expect(render({ rendered: false }).firstElementChild).toBeNull()

		const hidden = render({ visible: false }).firstElementChild as HTMLElement
		expect(hidden.style.display).toBe('none')
	})
})

describe('Button · внешний ctrl', () => {
	it('отражает состояние переданного инстанса', () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'accent', view: 'outlined' })
		const el = render({ ctrl }).firstElementChild as HTMLElement

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('FromCtrl')
		expect(el.className).toContain('s-button--accent')
		expect(el.className).toContain('s-button--a-outlined')
	})

	it('мутации инстанса обновляют DOM', () => {
		const ctrl = new TButton({ text: 'X' })
		const root = render({ ctrl })

		ctrl.text = 'Y'
		ctrl.variant = 'accent'
		flushSync()

		const el = root.firstElementChild as HTMLElement
		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Y')
		expect(el.className).toContain('s-button--accent')
	})

	it('смена tag через инстанс меняет корневой элемент', () => {
		const ctrl = new TButton()
		const root = render({ ctrl })

		expect((root.firstElementChild as HTMLElement).tagName.toLowerCase()).toBe('button')

		ctrl.tag = 'span'
		flushSync()

		expect((root.firstElementChild as HTMLElement).tagName.toLowerCase()).toBe('span')
	})
})

describe('Button · события через колбэк-пропы', () => {
	it('onChangeText вызывается при изменении из ядра', () => {
		const ctrl = new TButton({ text: 'A' })
		const seen: any[] = []

		render({ ctrl, onChangeText: (v: any) => seen.push(v) })

		ctrl.text = 'B'
		flushSync()

		// Свойства на TStateUnit отдают payload, а не голое значение
		// (в отличие от `view`, который эмитит значение) — см. TValuePayload.
		expect(seen).toEqual([{ newValue: 'B', oldValue: 'A' }])
	})

	it('onChangeView отдаёт значение', () => {
		const ctrl = new TButton({ view: 'filled' })
		const seen: string[] = []

		render({ ctrl, onChangeView: (v: string) => seen.push(v) })

		ctrl.view = 'plain'
		flushSync()

		expect(seen).toEqual(['plain'])
	})

	it('onChangeVisible не дублируется (дедупликация триггеров)', () => {
		const ctrl = new TButton()
		const seen: boolean[] = []

		render({ ctrl, onChangeVisible: (v: boolean) => seen.push(v) })

		ctrl.hide()
		flushSync()

		expect(seen).toHaveLength(1)
	})

	it('onElementReady приходит с DOM-узлом (attachment сработал)', async () => {
		const ctrl = new TButton()
		let element: unknown = null

		render({ ctrl, onElementReady: (el: unknown) => (element = el) })

		// TElementPlugin эмитит ready через requestAnimationFrame
		await new Promise((resolve) => setTimeout(resolve, 30))

		expect(element).toBeInstanceOf(HTMLElement)
	})
})

describe('Button · очистка', () => {
	it('снимает подписки с внешнего ctrl при размонтировании', () => {
		const ctrl = new TButton()
		const count = () => (ctrl.events as any)._items._items.get('change:text')?.size ?? 0

		const app = mount(Button as any, {
			target: document.body.appendChild(document.createElement('div')),
			props: { ctrl },
		})
		flushSync()

		expect(count()).toBeGreaterThan(0)

		unmount(app)
		flushSync()

		expect(count()).toBe(0)
	})
})

describe('Button · aria и доступ к плагинам', () => {
	it('на нативной кнопке лишних атрибутов нет', () => {
		const el = render({ disabled: true }).firstElementChild as HTMLElement

		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
	})

	it('на не-нативном теге появляются role, tabindex и aria-disabled', () => {
		const el = render({ tag: 'div' }).firstElementChild as HTMLElement

		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('tabindex')).toBe('0')
	})

	it('onBundleCreate отдаёт bundle, onActionCreate — сам плагин', async () => {
		const seen: any[] = []

		render({
			onBundleCreate: (b: unknown) => seen.push(['bundle', b]),
			onActionCreate: (p: unknown) => seen.push(['action', p]),
		})

		// createBundle откладывает эмит на микрозадачу — см. define-component.ts
		await Promise.resolve()

		expect(seen.map(([kind]) => kind)).toEqual(['bundle', 'action'])
		expect(seen[1][1]).toBeInstanceOf(TActionPlugin)
	})
})
