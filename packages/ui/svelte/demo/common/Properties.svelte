<script lang="ts" module>
	export type TPropertyType = 'boolean' | 'string' | 'number' | 'select'

	export interface IPropertyDefinition {
		type: TPropertyType
		default?: any
		options?: Array<{ value: any; label?: string }> | any[]
		placeholder?: string
	}

	export type TPropertiesSchema = Record<string, IPropertyDefinition>
</script>

<script lang="ts">
	import PropertyField from './PropertyField.svelte'

	type Props = {
		value: Record<string, any>
		schema: TPropertiesSchema
		onChange: (value: Record<string, any>) => void
		onShow?: () => void
		onHide?: () => void
	}

	const { value, schema, onChange, onShow, onHide }: Props = $props()

	const hasVisibilityActions = $derived('visible' in schema)

	function updateProperty(key: string, next: any) {
		onChange({ ...value, [key]: next })
	}

	function getValue(key: string) {
		return value[key] ?? schema[key]?.default
	}

	function optionValue(option: any) {
		return typeof option === 'object' && option !== null ? option.value : option
	}

	function optionLabel(option: any) {
		return typeof option === 'object' && option !== null && option.label
			? option.label
			: String(option)
	}
</script>

<div class="properties-panel">
	{#each Object.entries(schema) as [key, def] (key)}
		{#if def.type === 'boolean'}
			<PropertyField label={key}>
				<input
					type="checkbox"
					class="properties-panel__checkbox"
					checked={getValue(key)}
					onchange={(e) => updateProperty(key, e.currentTarget.checked)}
				/>
			</PropertyField>
		{:else if def.type === 'string' || def.type === 'number'}
			<PropertyField label={key}>
				<input
					type={def.type === 'number' ? 'number' : 'text'}
					class="properties-panel__input"
					placeholder={def.placeholder}
					value={getValue(key)}
					oninput={(e) =>
						updateProperty(
							key,
							def.type === 'number' ? e.currentTarget.valueAsNumber : e.currentTarget.value,
						)}
				/>
			</PropertyField>
		{:else if def.type === 'select' && def.options}
			<PropertyField label={key}>
				<select
					class="properties-panel__select"
					value={getValue(key)}
					onchange={(e) => updateProperty(key, e.currentTarget.value)}
				>
					{#each def.options as option, idx (idx)}
						<option value={optionValue(option)}>{optionLabel(option)}</option>
					{/each}
				</select>
			</PropertyField>
		{/if}
	{/each}

	{#if hasVisibilityActions}
		<PropertyField label="actions">
			<div class="properties-panel__actions">
				<button
					class="properties-panel__button"
					onclick={() => {
						updateProperty('visible', true)
						onShow?.()
					}}
				>
					Show
				</button>
				<button
					class="properties-panel__button"
					onclick={() => {
						updateProperty('visible', false)
						onHide?.()
					}}
				>
					Hide
				</button>
			</div>
		</PropertyField>
	{/if}
</div>
