import { h, replace } from './dom'

/**
 * Универсальная панель свойств для демо playground'ов.
 * Генерирует поля по схеме, как в остальных пакетах.
 */

export type TPropertyType = 'boolean' | 'string' | 'number' | 'select'

export interface IPropertyDefinition {
	type: TPropertyType
	default?: any
	options?: Array<{ value: any; label?: string }> | any[]
	placeholder?: string
}

export type TPropertiesSchema = Record<string, IPropertyDefinition>

type Options = {
	schema: TPropertiesSchema
	value: Record<string, any>
	onChange: (value: Record<string, any>) => void
	onShow?: () => void
	onHide?: () => void
}

function field(label: string, control: HTMLElement): HTMLElement {
	return h(
		'div',
		{ class: 'property-field' },
		// span, а не label: контрол приходит извне, связать по `for` нечем
		h('span', { class: 'property-field__label' }, `${label}:`),
		h('div', { class: 'property-field__control' }, control),
	)
}

function optionValue(option: any) {
	return typeof option === 'object' && option !== null ? option.value : option
}

function optionLabel(option: any) {
	return typeof option === 'object' && option !== null && option.label
		? option.label
		: String(option)
}

export function createProperties(options: Options) {
	const el = h('div', { class: 'properties-panel' })
	let value = { ...options.value }

	const update = (key: string, next: any) => {
		value = { ...value, [key]: next }
		options.onChange(value)
	}

	const get = (key: string) => value[key] ?? options.schema[key]?.default

	function render(): void {
		const fields: HTMLElement[] = []

		for (const [key, def] of Object.entries(options.schema)) {
			if (def.type === 'boolean') {
				const input = h('input', {
					type: 'checkbox',
					class: 'properties-panel__checkbox',
					on: { change: (e) => update(key, (e.target as HTMLInputElement).checked) },
				}) as HTMLInputElement

				input.checked = Boolean(get(key))
				fields.push(field(key, input))

				continue
			}

			if (def.type === 'string' || def.type === 'number') {
				const input = h('input', {
					type: def.type === 'number' ? 'number' : 'text',
					class: 'properties-panel__input',
					placeholder: def.placeholder,
					on: {
						input: (e) => {
							const target = e.target as HTMLInputElement

							update(key, def.type === 'number' ? target.valueAsNumber : target.value)
						},
					},
				}) as HTMLInputElement

				input.value = String(get(key) ?? '')
				fields.push(field(key, input))

				continue
			}

			if (def.type === 'select' && def.options) {
				const select = h('select', {
					class: 'properties-panel__select',
					on: { change: (e) => update(key, (e.target as HTMLSelectElement).value) },
				}) as HTMLSelectElement

				for (const option of def.options) {
					const node = h('option', { value: optionValue(option) }, optionLabel(option))

					select.appendChild(node)
				}

				select.value = String(get(key) ?? '')
				fields.push(field(key, select))
			}
		}

		if ('visible' in options.schema) {
			fields.push(
				field(
					'actions',
					h(
						'div',
						{ class: 'properties-panel__actions' },
						h(
							'button',
							{
								class: 'properties-panel__button',
								on: {
									click: () => {
										update('visible', true)
										options.onShow?.()
									},
								},
							},
							'Show',
						),
						h(
							'button',
							{
								class: 'properties-panel__button',
								on: {
									click: () => {
										update('visible', false)
										options.onHide?.()
									},
								},
							},
							'Hide',
						),
					),
				),
			)
		}

		replace(el, ...fields)
	}

	render()

	return { el }
}
