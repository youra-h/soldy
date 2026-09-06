import { h } from './dom'

export function panelDemo(
	options: { title?: string; info?: string },
	...children: (Node | string)[]
): HTMLElement {
	return h(
		'div',
		{ class: 'panel-demo' },
		options.title && h('h3', { class: 'panel-demo__title' }, options.title),
		h('div', { class: 'panel-demo__content' }, ...children),
		options.info && h('div', { class: 'panel-demo__info' }, options.info),
	)
}
