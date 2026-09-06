import { h } from '../../common/dom'
import { panelDemo } from '../../common/PanelDemo'

export function componentViewSlotsDemo() {
	const first = h(
		'soldy-component-view',
		{ class: 'cv-box cv-box--violet' },
		h('div', { class: 'cv-box__title' }, 'Default Slot'),
		h('div', { class: 'cv-box__hint' }, 'Simple text content'),
	)

	const second = h(
		'soldy-component-view',
		{ class: 'cv-box cv-box--orange' },
		h('div', { class: 'cv-box__title' }, 'Multiple Children'),
		h('button', { class: 'cv-box__button' }, 'Nested button'),
		h('div', { class: 'cv-box__hint' }, 'Any markup works'),
	)

	const el = h(
		'div',
		{ class: 'cv-slots' },
		panelDemo({ title: 'Default Slot' }, first),
		panelDemo({ title: 'Multiple Children' }, second),
	)

	function update(props: Record<string, any>): void {
		for (const view of [first, second]) {
			;(view as any).tag = props.tag
			;(view as any).visible = props.visible
			;(view as any).rendered = props.rendered
		}
	}

	return { el, update }
}
