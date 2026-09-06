import { For, Match, Show, Switch, type JSX } from 'solid-js'
import PropertyField from './PropertyField'

/**
 * Универсальный компонент Properties для демо playground'ов.
 * Автоматически генерирует поля на основе схемы свойств.
 */

export type TPropertyType = 'boolean' | 'string' | 'number' | 'select'

export interface IPropertyDefinition {
	type: TPropertyType
	default?: any
	options?: Array<{ value: any; label?: string }> | any[]
	placeholder?: string
}

export type TPropertiesSchema = Record<string, IPropertyDefinition>

type PropertiesProps = {
	value: Record<string, any>
	schema: TPropertiesSchema
	onChange: (value: Record<string, any>) => void
	onShow?: () => void
	onHide?: () => void
}

function optionValue(option: any) {
	return typeof option === 'object' && option !== null ? option.value : option
}

function optionLabel(option: any) {
	return typeof option === 'object' && option !== null && option.label
		? option.label
		: String(option)
}

export default function Properties(props: PropertiesProps): JSX.Element {
	const update = (key: string, next: any) => props.onChange({ ...props.value, [key]: next })
	const getValue = (key: string) => props.value[key] ?? props.schema[key]?.default

	return (
		<div class="properties-panel">
			<For each={Object.entries(props.schema)}>
				{([key, def]) => (
					<Switch>
						<Match when={def.type === 'boolean'}>
							<PropertyField label={key}>
								<input
									type="checkbox"
									class="properties-panel__checkbox"
									checked={getValue(key)}
									onChange={(e) => update(key, e.currentTarget.checked)}
								/>
							</PropertyField>
						</Match>

						<Match when={def.type === 'string' || def.type === 'number'}>
							<PropertyField label={key}>
								<input
									type={def.type === 'number' ? 'number' : 'text'}
									class="properties-panel__input"
									placeholder={def.placeholder}
									value={getValue(key)}
									onInput={(e) =>
										update(
											key,
											def.type === 'number'
												? e.currentTarget.valueAsNumber
												: e.currentTarget.value,
										)
									}
								/>
							</PropertyField>
						</Match>

						<Match when={def.type === 'select' && def.options}>
							<PropertyField label={key}>
								<select
									class="properties-panel__select"
									value={getValue(key)}
									onChange={(e) => update(key, e.currentTarget.value)}
								>
									<For each={def.options}>
										{(option) => <option value={optionValue(option)}>{optionLabel(option)}</option>}
									</For>
								</select>
							</PropertyField>
						</Match>
					</Switch>
				)}
			</For>

			<Show when={'visible' in props.schema}>
				<PropertyField label="actions">
					<div class="properties-panel__actions">
						<button
							class="properties-panel__button"
							onClick={() => {
								update('visible', true)
								props.onShow?.()
							}}
						>
							Show
						</button>
						<button
							class="properties-panel__button"
							onClick={() => {
								update('visible', false)
								props.onHide?.()
							}}
						>
							Hide
						</button>
					</div>
				</PropertyField>
			</Show>
		</div>
	)
}
