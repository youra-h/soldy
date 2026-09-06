/**
 * Минимальный DOM-хелпер для демо.
 *
 * Web Components не приносят с собой ни шаблонов, ни реактивности, поэтому
 * разметку демо приходится строить вручную. Это код демо, а не библиотеки:
 * в самих компонентах никакого h() нет — там прямые DOM-операции.
 */

type Child = Node | string | number | false | null | undefined

export type Props = Record<string, unknown> & {
	class?: string
	/** Обработчики: on: { click: fn } */
	on?: Record<string, EventListener>
}

/** Создаёт элемент: h('div', { class: 'x' }, 'текст', h('span')) */
export function h<K extends keyof HTMLElementTagNameMap>(
	tag: K | string,
	props: Props = {},
	...children: Child[]
): HTMLElement {
	const el = document.createElement(tag)

	for (const [key, value] of Object.entries(props)) {
		if (key === 'on') {
			for (const [event, handler] of Object.entries(value as Record<string, EventListener>)) {
				el.addEventListener(event, handler)
			}

			continue
		}

		if (value === undefined || value === false || value === null) continue

		// Свойства кастомных элементов и объекты идут через property, а не атрибут
		if (key in el && typeof value === 'object') {
			;(el as any)[key] = value

			continue
		}

		if (value === true) {
			el.setAttribute(key, '')

			continue
		}

		el.setAttribute(key, String(value))
	}

	append(el, children)

	return el
}

export function append(parent: Node, children: Child[]): void {
	for (const child of children) {
		if (child === null || child === undefined || child === false) continue

		parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)))
	}
}

/** Заменяет содержимое узла. */
export function replace(parent: Node, ...children: Child[]): void {
	while (parent.firstChild) parent.removeChild(parent.firstChild)

	append(parent, children)
}
