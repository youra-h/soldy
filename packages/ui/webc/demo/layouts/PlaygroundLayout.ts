import { h } from '../common/dom'

type Sections = {
	title: string
	properties?: Node
	propsDemo?: Node
	instanceDemo?: Node
	slotsDemo?: Node
}

function column(title: string, content: Node): HTMLElement {
	return h(
		'div',
		{ class: 'pg-layout__demo-column' },
		h('h3', { class: 'pg-layout__demo-title' }, title),
		h('div', { class: 'pg-layout__demo-content' }, content),
	)
}

export function playgroundLayout(sections: Sections): HTMLElement {
	return h(
		'div',
		{ class: 'pg-layout' },
		h('div', { class: 'pg-layout__header' }, h('h1', { class: 'pg-layout__title' }, sections.title)),
		h(
			'div',
			{ class: 'pg-layout__section pg-layout__section--properties' },
			h('h2', { class: 'pg-layout__section-title' }, 'Properties'),
			sections.properties ?? null,
		),
		h(
			'div',
			{ class: 'pg-layout__demo-grid' },
			sections.propsDemo && column('Props Demo', sections.propsDemo),
			sections.instanceDemo && column('Instance Demo', sections.instanceDemo),
			sections.slotsDemo && column('Slots Demo', sections.slotsDemo),
		),
	)
}
