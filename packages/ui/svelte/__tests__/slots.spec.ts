/**
 * Слоты Svelte — snippet-пропы.
 *
 * Сниппеты нельзя объявить из тестового кода без .svelte-файла, поэтому
 * содержимое задаётся через тестовую обёртку Slots.test.svelte.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount, unmount, flushSync } from 'svelte'
import { ButtonDescriptor } from '@soldy/setup'
import Harness from './Slots.test.svelte'

const mounted: any[] = []

function render(props: Record<string, any> = {}): HTMLElement {
	const target = document.createElement('div')

	document.body.appendChild(target)
	mounted.push(mount(Harness as any, { target, props }))
	flushSync()

	return target
}

afterEach(() => {
	while (mounted.length) unmount(mounted.pop())
	document.body.innerHTML = ''
})

const root = (target: HTMLElement) => target.firstElementChild as HTMLElement

describe('соответствие контракту', () => {
	it('обёртка передаёт ровно слоты дескриптора', () => {
		// children — это `default` контракта в терминах Svelte
		expect(ButtonDescriptor().getSlots().map((slot) => slot.name).sort()).toEqual([
			'default',
			'leading',
			'trailing',
		])
	})
})

describe('поведение слотов Button', () => {
	it('leading ставится перед текстом, trailing — после', () => {
		const el = root(render({ text: 'Mid', withLeading: true, withTrailing: true }))

		// Пробелы между узлами Svelte сохраняет — важен порядок, а не они
		expect(el.textContent?.replace(/\s+/g, '')).toBe('LMidT')
	})

	it('содержимое children переопределяет text', () => {
		const el = root(render({ text: 'ignored', withChildren: true }))

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Custom')
	})

	it('слот children получает scope с text', () => {
		const el = root(render({ text: 'Scoped', withScoped: true }))

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const el = root(render({ text: 'Fallback' }))

		expect(el.querySelector('.s-button__text')?.textContent?.trim()).toBe('Fallback')
	})
})
