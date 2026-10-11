/**
 * Skeleton в Svelte: заглушка поверх содержимого.
 *
 * Корень есть всегда — в нём лежит содержимое, — а `rendered` и `visible`
 * решают только, показана ли заглушка. Раскладка корня поэтому видимость не
 * получает: `display: none` спрятал бы и содержимое.
 *
 * `variant` — проп, а не атрибут разметки (тот же сценарий, что у Vue и React).
 * Значения — условные имена из фикстуры темы (`__tests__/theme.d.ts`), не
 * имена oren.
 */

import { describe, it, expect } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { Skeleton, type SkeletonProps } from '@soldy-ui/svelte'
import { mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'

const variantClasses = (el: HTMLElement) =>
	[...el.classList].filter((name) => name.includes('--variant-'))

/** Настоящее содержимое под заглушкой. */
const content = createRawSnippet(() => ({ render: () => '<b>Данные</b>' }))

describe('Skeleton · variant', () => {
	it('доходит до инстанса: у корня класс варианта, атрибута variant нет', () => {
		const el = mount(Skeleton, { variant: 'brand' }).root()

		expect(variantClasses(el)).toEqual(['s-skeleton--variant-brand'])
		expect(el.hasAttribute('variant')).toBe(false)
	})

	it('смена пропа меняет класс', () => {
		const props = reactiveProps<SkeletonProps>({ variant: 'brand' })
		const { root } = mount(Skeleton, props)

		props.variant = 'danger'
		flushSync()

		expect(variantClasses(root())).toEqual(['s-skeleton--variant-danger'])
	})
})

describe('Skeleton · заглушка и содержимое', () => {
	it('показанная заглушка — перед содержимым, скрыта от скринридера', () => {
		const el = mount(Skeleton, { children: content }).root()

		expect([...el.children].map((child) => child.localName)).toEqual(['div', 'b'])
		expect(el.firstElementChild?.className).toBe('s-skeleton__placeholder')
		expect(el.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
		// Пока заглушка показана, область занята
		expect(el.getAttribute('aria-busy')).toBe('true')
	})

	it('visible={false}: заглушки нет, содержимое на месте, корень не скрыт', () => {
		const el = mount(Skeleton, { visible: false, children: content }).root()

		expect(el.querySelector('.s-skeleton__placeholder')).toBeNull()
		expect(el.querySelector('b')?.textContent).toBe('Данные')
		expect(el.style.display).toBe('')
		expect(el.hasAttribute('aria-busy')).toBe(false)
	})

	it('rendered={false}: то же — корень остаётся с содержимым', () => {
		const el = mount(Skeleton, { rendered: false, children: content }).root()

		expect(el.querySelector('.s-skeleton__placeholder')).toBeNull()
		expect(el.querySelector('b')?.textContent).toBe('Данные')
	})

	it('заглушка уходит и возвращается со сменой visible', () => {
		const props = reactiveProps<SkeletonProps>({})
		const { root } = mount(Skeleton, props)

		props.visible = false
		flushSync()

		expect(root().querySelector('.s-skeleton__placeholder')).toBeNull()

		props.visible = true
		flushSync()

		expect(root().querySelector('.s-skeleton__placeholder')).not.toBeNull()
	})
})

describe('Skeleton · размер', () => {
	it('width и height — стилем корня', () => {
		const el = mount(Skeleton, { width: 120, height: '1em' }).root()

		expect(el.style.width).toBe('120px')
		expect(el.style.height).toBe('1em')
	})
})
