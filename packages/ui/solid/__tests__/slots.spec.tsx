/**
 * Слоты Solid — props с JSX; scoped-слот принимает функцию.
 */

import { describe, it, expect, afterEach } from 'vitest'
import type { ComponentProps } from 'solid-js'
import { render } from 'solid-js/web'
import { ButtonDescriptor } from '@soldy/setup'
import { Button } from '@soldy/ui-solid'

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

const root = (target: HTMLElement) => target.firstElementChild as HTMLElement

describe('соответствие контракту', () => {
	it('дескриптор объявляет leading, default, trailing', () => {
		expect(
			ButtonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		).toEqual(['default', 'leading', 'trailing'])
	})
})

describe('поведение слотов Button', () => {
	it('leading ставится перед текстом, trailing — после', () => {
		const el = root(mount({ text: 'Mid', leading: <i>L</i>, trailing: <i>T</i> }))

		expect(el.textContent?.replace(/\s+/g, '')).toBe('LMidT')
	})

	it('содержимое children переопределяет text', () => {
		const el = root(mount({ text: 'ignored', children: <b>Custom</b> }))

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Custom')
	})

	it('слот children получает scope с text', () => {
		const el = root(
			mount({
				text: 'Scoped',
				children: (scope: { text: string }) => <b>{scope.text}!</b>,
			}),
		)

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const el = root(mount({ text: 'Fallback' }))

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Fallback')
	})
})

describe('слоты не уходят в атрибуты корня', () => {
	it('leading и trailing не становятся атрибутами', () => {
		const el = root(mount({ text: 'Mid', leading: <i>L</i>, trailing: <i>T</i> }))

		expect(el.hasAttribute('leading')).toBe(false)
		expect(el.hasAttribute('trailing')).toBe(false)
	})
})
