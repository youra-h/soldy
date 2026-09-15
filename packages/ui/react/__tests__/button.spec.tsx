/**
 * Button — disabled во всех трёх наборах ядра.
 *
 * Нативный `disabled` и `aria-disabled` решает тег: ядро пишет их в `attrs` и
 * `aria`. Тема читает `data-disabled` из `dataset` — оно одно на любом теге.
 * Тот же сценарий, что в `button.spec.*` остальных адаптеров: наборы каждый
 * адаптер раскладывает сам, и забытый спред молча оставил бы тему без
 * атрибута.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TButton } from '@soldy/core'
import { Button, type ButtonProps } from '@soldy/ui-react'

const roots: Root[] = []

function mount(props: ButtonProps = {}): HTMLElement {
	const target = document.createElement('div')

	document.body.appendChild(target)

	const reactRoot = createRoot(target)

	roots.push(reactRoot)

	act(() => {
		reactRoot.render(<Button {...props} />)
	})

	return target
}

afterEach(() => {
	while (roots.length) {
		const reactRoot = roots.pop()!

		act(() => reactRoot.unmount())
	}

	document.body.innerHTML = ''
})

const root = (target: HTMLElement) => target.firstElementChild as HTMLElement

describe('Button · disabled', () => {
	it('на <button> — нативный disabled, без aria-disabled', () => {
		const el = root(mount({ disabled: true }))

		expect(el.tagName.toLowerCase()).toBe('button')
		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('true')
	})

	it('на других тегах — aria-disabled, без нативного disabled', () => {
		const el = root(mount({ tag: 'a', disabled: true }))

		expect(el.getAttribute('aria-disabled')).toBe('true')
		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('true')
	})

	it('fieldset тоже нативный тег — атрибут disabled, без aria-disabled', () => {
		const el = root(mount({ tag: 'fieldset', disabled: true }))

		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('true')
	})

	/** Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не пропавший атрибут. */
	it('без disabled — data-disabled="false"', () => {
		const el = root(mount())

		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('false')
	})

	it('data-disabled следует за инстансом и переживает смену тега', () => {
		const ctrl = new TButton()
		const target = mount({ ctrl })

		expect(root(target).getAttribute('data-disabled')).toBe('false')

		act(() => {
			ctrl.disabled = true
		})

		expect(root(target).hasAttribute('disabled')).toBe(true)
		expect(root(target).getAttribute('data-disabled')).toBe('true')

		act(() => {
			ctrl.tag = 'span'
		})

		expect(root(target).tagName.toLowerCase()).toBe('span')
		expect(root(target).getAttribute('aria-disabled')).toBe('true')
		expect(root(target).getAttribute('data-disabled')).toBe('true')

		act(() => {
			ctrl.disabled = false
		})

		expect(root(target).getAttribute('data-disabled')).toBe('false')
	})
})
