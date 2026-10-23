/**
 * NativeTextarea — неуправляемая `<textarea>`, чей текст ведёт ядро: то же,
 * что `NativeInput`. AGENTS.md (React), «Поля ввода».
 */

import { useLayoutEffect, useRef } from 'react'
import type { ReactElement, TextareaHTMLAttributes } from 'react'

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
