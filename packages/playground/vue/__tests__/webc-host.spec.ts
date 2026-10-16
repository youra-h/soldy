/**
 * Хост Web Components — то, что у него своё.
 *
 * Общее со всеми хостами — витрину, страницы, сценарии, язык — проверяют
 * дымовые тесты по списку фреймворков. Здесь — описание элемента, которым
 * хост рисует превью и фикстуры: свои атрибуты элемента (роль иконки) стоят на
 * нём, как в разметке, а дети по слотам — его светом, и первая сборка
 * раскладывает их по слотам.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { getIcon } from '@soldy-ui/setup'
import { loadHost } from '../src/hosts'

const host = await loadHost('webc')

/** Узлы оболочки под превью — снимаются после теста. */
const nodes: HTMLElement[] = []

function stage(): HTMLElement {
	const node = document.createElement('div')

	document.body.appendChild(node)
	nodes.push(node)

	return node
}

afterEach(() => {
	for (const node of nodes.splice(0)) node.remove()
})

/** Роль иконки и `viewBox` её рисунка — так видно, что нарисовано. */
function drawn(icon: Element): [string | null, string | null | undefined] {
	return [icon.getAttribute('icon'), icon.querySelector(':scope > svg')?.getAttribute('viewBox')]
}

describe('хост Web Components', () => {
	it('превью Icon — роль своим атрибутом элемента, рисунок роли внутри', () => {
		const node = stage()
		const handle = host.mount(node, { component: 'icon', props: { size: 'lg' } })
		const icon = node.querySelector('span.so-icon')

		if (!icon) throw new Error('иконки нет')

		expect(drawn(icon)).toEqual(['arrowDown', getIcon('arrowDown').viewBox])
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)

		handle.unmount()
	})

	/**
	 * Пропсы строки — элементу фикстуры, а не его детям: в разметке остальных
	 * хостов они тоже стоят только на компоненте сценария.
	 */
	it('фикстура — элемент с детьми по слотам: иконки по краям подписи', () => {
		const node = stage()
		const handle = host.mount(node, {
			component: 'button',
			fixture: 'button-slot-icons',
			props: { text: 'Подпись', size: 'lg' },
		})
		const button = node.querySelector('button.so-button')

		if (!button) throw new Error('кнопки нет')

		const [leading, text, trailing] = [...button.children]

		expect(button.children).toHaveLength(3)
		expect(drawn(leading)).toEqual(['check', getIcon('check').viewBox])
		expect(text.textContent).toBe('Подпись')
		expect(drawn(trailing)).toEqual(['arrowRight', getIcon('arrowRight').viewBox])
		expect(button.classList.contains('so-button--size-lg')).toBe(true)
		expect(
			[leading, trailing].map((icon) => icon.classList.contains('so-icon--size-normal')),
		).toEqual([true, true])

		handle.unmount()
	})
})
