/**
 * NativeInput — `<input>`, чьё живое состояние ведёт ядро: текст поля,
 * отметку и «выбрано частично». Аналог привязок свойств DOM у Vue — `:value`,
 * `:checked`, `:indeterminate`: у разметки React таких привязок нет.
 *
 * Своих режимов поля у React два, и оба не подходят. Контролируемое поле
 * (`value` или `checked` пропом) без `onChange` React считает ошибкой, а
 * `onChange` писал бы значение вторым путём рядом с плагинами ввода ядра.
 * `indeterminate` же атрибутом не выразить вовсе — это только свойство узла.
 * Поэтому поле неуправляемое, а состояние проводит сам компонент:
 *
 * - умолчание — в разметку: `defaultValue` и `defaultChecked` дают атрибуты
 *   `value` и `checked` серверной разметки и первой отрисовки;
 * - свойство — в узел после коммита, до отрисовки кадра, когда сменилось
 *   состояние ядра, — как привязка Vue. Текст — только если разошёлся с
 *   узлом: запись того же текста при наборе сбросила бы каретку. Отметка — и
 *   совпавшая с узлом: React узнаёт отметку поля только по записи свойства и
 *   по ней решает, сменил ли клик отметку, прежде чем отдать `onChange`. А у
 *   радио отметку снимает и браузер — когда отмечают соседа. Без записи React
 *   считал бы радио отмеченным, и следующий выбор его не дал бы `onChange`.
 *
 * Ввод пользователя в ядро несут плагины (`TInputPlugin`, `TInputBoolPlugin`)
 * или разметка компонента — выбор радио приходит `onChange`, как `@change` у
 * Vue. Своего `onChange` у поля нет.
 *
 * Живое состояние — отдельно от атрибутов: у флажка и радио атрибут `value` —
 * значение для формы, а живое у них — отметка. Какие свойства ведёт ядро,
 * говорит сам набор `live`, ветки по `type` нет. `undefined` в наборе — пустое
 * поле и снятая отметка, как у Vue.
 *
 * `ref`, пришедший с атрибутами потребителя, свой не выбивает: без него поле
 * не узнало бы свой узел.
 */

import { useLayoutEffect, useRef } from 'react'
import type { InputHTMLAttributes, ReactElement } from 'react'

/** Живое состояние поля: свойства узла, которые ведёт ядро. */
export type TNativeInputLive = {
	/** Текст текстового поля. */
	readonly value?: string
	/** Отметка флажка и радио. */
	readonly checked?: boolean
	/** «Выбрано частично» у флажка. */
	readonly indeterminate?: boolean
}

/**
 * Атрибуты `<input>` без живого состояния и его умолчаний: их поле берёт из
 * `live`. `checked` атрибутом сделал бы поле контролируемым. `value` остаётся —
 * у флажка и радио это значение для формы.
 */
export type TNativeInputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'checked' | 'defaultChecked' | 'defaultValue'
> & {
	/** Состояние, которое ведёт ядро: ключа нет — свойство поле не трогает. */
	live: TNativeInputLive
}

/** Значения свойств узла: ключа нет — свойства в наборе нет. */
type TProperties = {
	value?: string
	checked?: boolean
	indeterminate?: boolean
}

function toProperties(live: TNativeInputLive): TProperties {
	return {
		value: 'value' in live ? (live.value ?? '') : undefined,
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
		// И совпавшую с узлом: запись сообщает отметку React (см. шапку файла)
		if (checked !== undefined) input.checked = checked
		if (indeterminate !== undefined && input.indeterminate !== indeterminate) {
			input.indeterminate = indeterminate
		}
	}, [value, checked, indeterminate])

	return <input {...attributes} ref={node} defaultValue={value} defaultChecked={checked} />
}
