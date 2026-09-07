import { h, replace } from '../../common/dom'

const VIEWS = ['filled', 'plain', 'outlined'] as const

/** Демо содержимого: текст из props против содержимого внутри тега. */
export function buttonSlotsDemo() {
	const grid = h('div', { class: 'demo-grid' })

	const slots = h('div', { class: 'demo-section-content' })

	const el = h(
		'div',
		{ class: 'demo-container' },
		h('h3', { class: 'demo-title' }, 'Views & Children'),
		grid,
		h('h3', { class: 'demo-title' }, 'Slots'),
		slots,
		h(
			'div',
			{ class: 'demo-info' },
			'Слоты leading / default / trailing. Scope в Web Components недоступен: ' +
				'передать данные в световое содержимое платформе нечем.',
		),
	)

	function update(props: Record<string, any>): void {
		replace(
			grid,
			...VIEWS.map((view) =>
				h(
					'div',
					{ class: 'demo-section' },
					h('h4', { class: 'demo-section-title' }, view),
					h(
						'div',
						{ class: 'demo-section-content' },
						h('soldy-button', {
							view,
							text: 'Default',
							size: props.size,
							variant: props.variant,
							disabled: Boolean(props.disabled),
						}),
						h(
							'soldy-button',
							{
								view,
								size: props.size,
								variant: props.variant,
								disabled: Boolean(props.disabled),
							},
							h('span', {}, 'Custom children'),
						),
					),
				),
			),
		)

		replace(
			slots,
			h(
				'soldy-button',
				{
					text: 'Both',
					size: props.size,
					variant: props.variant,
					disabled: Boolean(props.disabled),
				},
				h('span', { slot: 'leading' }, '◀'),
				h('span', { slot: 'trailing' }, '▶'),
			),
		)
	}

	return { el, update }
}
