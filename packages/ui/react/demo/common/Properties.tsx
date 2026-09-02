import PropertyField from './PropertyField'

/**
 * Универсальный компонент Properties для демо playground'ов.
 * Автоматически генерирует поля на основе схемы свойств.
 */

export type TPropertyType = 'boolean' | 'string' | 'number' | 'select'

export interface IPropertyDefinition {
	/** Тип поля */
	type: TPropertyType
	/** Значение по умолчанию */
	default?: any
	/** Опции для select */
	options?: Array<{ value: any; label?: string }> | any[]
	/** Плейсхолдер для input */
	placeholder?: string
	/** Является ли это действием (кнопка show/hide) */
	isAction?: boolean
}

export type TPropertiesSchema = Record<string, IPropertyDefinition>

type PropertiesProps<T extends Record<string, any>> = {
	/** Текущие значения свойств */
	value: T
	/** Схема свойств (описание полей) */
	schema: TPropertiesSchema
	/** Обновление значения */
	onChange: (value: T) => void
	onShow?: () => void
	onHide?: () => void
}

export default function Properties<T extends Record<string, any>>({
	value,
	schema,
	onChange,
	onShow,
	onHide,
}: PropertiesProps<T>) {
	const updateProperty = (key: string, nextValue: any) => {
		onChange({ ...value, [key]: nextValue } as T)
	}

	const getValue = (key: string) => value[key] ?? schema[key]?.default

	const hasVisibilityActions = 'visible' in schema

	/** Показать компонент: обновляем visible + дёргаем instance.show() */
	const handleShow = () => {
		updateProperty('visible', true)
		onShow?.()
	}

	/** Скрыть компонент: обновляем visible + дёргаем instance.hide() */
	const handleHide = () => {
		updateProperty('visible', false)
		onHide?.()
	}

	return (
		<div className="properties-panel">
			{Object.entries(schema).map(([key, def]) => {
				if (def.type === 'boolean') {
					return (
						<PropertyField key={key} label={key}>
							<input
								type="checkbox"
								checked={getValue(key)}
								onChange={(event) => updateProperty(key, event.target.checked)}
								className="properties-panel__checkbox"
							/>
						</PropertyField>
					)
				}

				if (def.type === 'string' || def.type === 'number') {
					return (
						<PropertyField key={key} label={key}>
							<input
								type={def.type === 'number' ? 'number' : 'text'}
								value={getValue(key)}
								onChange={(event) =>
									updateProperty(
										key,
										def.type === 'number' ? event.target.valueAsNumber : event.target.value,
									)
								}
								placeholder={def.placeholder}
								className="properties-panel__input"
							/>
						</PropertyField>
					)
				}

				if (def.type === 'select' && def.options) {
					return (
						<PropertyField key={key} label={key}>
							<select
								value={getValue(key)}
								onChange={(event) => updateProperty(key, event.target.value)}
								className="properties-panel__select"
							>
								{def.options.map((option, idx) => {
									const isObject = typeof option === 'object' && option !== null
									const optionValue = isObject ? (option as any).value : option
									const optionLabel =
										isObject && (option as any).label ? (option as any).label : String(option)

									return (
										<option key={idx} value={optionValue}>
											{optionLabel}
										</option>
									)
								})}
							</select>
						</PropertyField>
					)
				}

				return null
			})}

			{hasVisibilityActions && (
				<PropertyField label="actions">
					<div className="properties-panel__actions">
						<button onClick={handleShow} className="properties-panel__button">
							Show
						</button>
						<button onClick={handleHide} className="properties-panel__button">
							Hide
						</button>
					</div>
				</PropertyField>
			)}
		</div>
	)
}
