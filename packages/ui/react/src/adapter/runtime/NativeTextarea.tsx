/**
 * NativeTextarea — `<textarea>`, чей текст ведёт ядро: то же, что
 * `NativeInput` у `<input>`, — аналог привязки свойства `:value` у Vue.
 *
 * Контролируемое поле React (`value` пропом) без `onChange` считает ошибкой,
 * а `onChange` писал бы текст вторым путём рядом с плагином ввода ядра. Поэтому
 * поле неуправляемое, а текст проводит сам компонент:
 *
 * - умолчание — в разметку: `defaultValue` у `<textarea>` React рисует её
 *   содержимым, и текст есть в серверной разметке и первой отрисовке;
 * - свойство — в узел после коммита, до отрисовки кадра, когда текст ядра
 *   сменился, и только если он разошёлся с узлом: запись того же текста при
 *   наборе сбросила бы каретку, а набор через IME прервала бы.
 *
 * Ввод пользователя в ядро несёт плагин ввода (`TInputPlugin`). Своего
 * `onChange` у поля нет. `undefined` — пустое поле, как у Vue.
 *
 * `ref`, пришедший с атрибутами, свой не выбивает: без него поле не узнало бы
 * свой узел. `ref` потребителя сюда и не приходит — он ведёт к корню
 * компонента (`toControlAttrs`).
 */

import { useLayoutEffect, useRef } from 'react'
import type { ReactElement, TextareaHTMLAttributes } from 'react'

/**
 * Атрибуты `<textarea>` без текста и его умолчания: текст поле берёт из
 * `text`, а `value` атрибутом сделал бы поле контролируемым.
 */
export type TNativeTextareaProps = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	'value' | 'defaultValue'
> & {
	/** Текст, который ведёт ядро; `undefined` — пустое поле. */
	text: string | undefined
}

export function NativeTextarea({ text, ...attributes }: TNativeTextareaProps): ReactElement {
	const node = useRef<HTMLTextAreaElement>(null)
	const value = text ?? ''

	useLayoutEffect(() => {
		const textarea = node.current

		if (textarea && textarea.value !== value) textarea.value = value
	}, [value])

	return <textarea {...attributes} ref={node} defaultValue={value} />
}
