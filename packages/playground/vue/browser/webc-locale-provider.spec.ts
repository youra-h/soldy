/**
 * `<so-locale-provider>` в настоящем браузере — своей коробки у него нет.
 *
 * Провайдер локали Web Components — автономный элемент, а не компонент:
 * теневой корень несёт только `<slot>` и `:host { display: contents }`, и
 * дети провайдера раскладываются там, где он стоит, — его родителем. Правило
 * `:host` слабее стилей документа, поэтому `display` потребителя главнее.
 * jsdom ни раскладки, ни каскада между теневым деревом и документом не
 * считает, поэтому спек браузерный. Локаль поддерева сторожит
 * `ui/webc/__tests__/locale.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'

import { TLocaleProviderElement } from '@soldy-ui/webc'

/** Узел разметки теста — снимается после каждого. */
let stage: HTMLElement | null = null

/** Разметка на странице: флекс-ряд, ширины детей заданы. */
function show(html: string): HTMLElement {
	const node = document.createElement('div')

	node.style.display = 'flex'
	node.style.gap = '10px'
	node.innerHTML = html
	document.body.appendChild(node)
	stage = node

	return node
}

afterEach(() => {
	stage?.remove()
	stage = null
})

/** Провайдер разметки теста; нет его — тест падает здесь. */
function provider(root: ParentNode): TLocaleProviderElement {
	const node = root.querySelector('so-locale-provider')

	if (!(node instanceof TLocaleProviderElement)) throw new Error('<so-locale-provider> нет')

	return node
}

/** Узел по селектору; нет его — тест падает здесь. */
function find(root: ParentNode, selector: string): HTMLElement {
	const node = root.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: узла нет`)

	return node
}

describe('<so-locale-provider> · своей коробки нет', () => {
	/**
	 * Будь у провайдера коробка, он сам стал бы элементом ряда, а его дети —
	 * блоками внутри него, одним под другим.
	 */
	it('дети провайдера — элементы ряда его родителя', () => {
		const root = show(`
			<i class="before" style="display: block; width: 20px; height: 10px"></i>
			<so-locale-provider>
				<i class="first" style="display: block; width: 30px; height: 10px"></i>
				<i class="second" style="display: block; width: 30px; height: 10px"></i>
			</so-locale-provider>
		`)
		const before = find(root, '.before').getBoundingClientRect()
		const first = find(root, '.first').getBoundingClientRect()
		const second = find(root, '.second').getBoundingClientRect()

		expect(getComputedStyle(provider(root)).display).toBe('contents')
		// Дети провайдера встали в ряд за соседом и друг за другом, через зазор ряда
		expect(first.left - before.right).toBe(10)
		expect(second.left - first.right).toBe(10)
		expect([first.top, second.top]).toEqual([before.top, before.top])
	})

	it('display потребителя главнее :host провайдера', () => {
		const root = show(`
			<style>.boxed { display: block; width: 50px }</style>
			<so-locale-provider class="boxed">
				<i class="inside" style="display: block; width: 30px; height: 10px"></i>
			</so-locale-provider>
		`)
		const box = provider(root)

		expect(getComputedStyle(box).display).toBe('block')
		expect(box.getBoundingClientRect().width).toBe(50)
	})
})
