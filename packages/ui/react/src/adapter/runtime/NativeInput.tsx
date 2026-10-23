/**
 * NativeInput — неуправляемый `<input>`, чьё живое состояние (текст, значение
 * ползунка, отметку, «выбрано частично») ведёт ядро: аналог `:value`,
 * `:checked`, `:indeterminate` у Vue. AGENTS.md (React), «Поля ввода».
 */

import { useLayoutEffect, useRef } from 'react'
import type { InputHTMLAttributes, ReactElement } from 'react'

/** Живое состояние поля: свойства узла, которые ведёт ядро. */
export type TNativeInputLive = {
	/** Текст текстового поля или значение ползунка (`type="range"`). */
	readonly value?: string | number
	/** Отметка флажка и радио. */
	readonly checked?: boolean
	/** «Выбрано частично» у флажка. */
	readonly indeterminate?: boolean
}

/**
 * Атрибуты `<input>` без живого состояния: `checked` атрибутом сделал бы поле
 * контролируемым, а `value` у флажка и радио — значение для формы.
 */
export type TNativeInputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'checked' | 'defaultChecked' | 'defaultValue'
> & {
	/** Состояние, которое ведёт ядро: ключа нет — свойство поле не трогает. */
	live: TNativeInputLive
}

type TProperties = {
	value?: string
	checked?: boolean
	indeterminate?: boolean
}

function toProperties(live: TNativeInputLive): TProperties {
	return {
		// Свойство узла — строка: число ползунка — его строкой, как `:value` у Vue
		value: 'value' in live ? String(live.value ?? '') : undefined,
		checked: 'checked' in live ? live.checked === true : undefined,
		indeterminate: 'indeterminate' in live ? live.indeterminate === true : undefined,
	}
}

export function NativeInput({ live, ...attributes }: TNativeInputProps): ReactElement {
	const node = useRef<HTMLInputElement>(null)
	const { value, checked, indeterminate } = toProperties(live)

	useLayoutEffect(() => {
		const input = node.current

		if (!input) return

		if (value !== undefined && input.value !== value) input.value = value
		// И совпавшую с узлом: запись сообщает отметку React
		if (checked !== undefined) input.checked = checked
		if (indeterminate !== undefined && input.indeterminate !== indeterminate) {
			input.indeterminate = indeterminate
		}
	}, [value, checked, indeterminate])

	return <input {...attributes} ref={node} defaultValue={value} defaultChecked={checked} />
}
