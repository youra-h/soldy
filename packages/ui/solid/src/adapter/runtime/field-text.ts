/**
 * Текст поля на узле — только когда он разошёлся с узлом, как `:value` у Vue.
 * Привязку `value` Solid пишет на каждую смену, и запись узлу его же текста
 * снимала бы с поля пометку «изменено пользователем» (`minlength` перестаёт
 * проверяться). Атрибуты ложатся на поле последними.
 * AGENTS.md (Solid), «Текст поля».
 */

import { createEffect } from 'solid-js'
import { isServer } from 'solid-js/web'

/** Атрибуты `<input>`: в браузере `ref` поля, на сервере — `value`. */
export type TFieldText =
	{ readonly ref: (node: HTMLInputElement) => void } | { readonly value: string | undefined }

/** Атрибуты `<textarea>`: в браузере `ref` поля, на сервере — `textContent`. */
export type TTextareaText =
	| { readonly ref: (node: HTMLTextAreaElement) => void }
	| { readonly textContent: string | undefined }

/**
 * `ref` поля, который ведёт его текст. Эффект — пользовательский: Solid
 * выполняет его после атрибутов узла, а `range` прижимает значение к `min` и
 * `max`.
 */
function textRef<TNode extends HTMLInputElement | HTMLTextAreaElement>(
	getText: () => string | undefined,
): (node: TNode) => void {
	return (node) => {
		createEffect(() => {
			const text = getText() ?? ''

			if (node.value !== text) node.value = text
		})
	}
}

export function fieldText(getText: () => string | undefined): TFieldText {
	if (isServer) {
		return {
			get value() {
				return getText()
			},
		}
	}

	return { ref: textRef<HTMLInputElement>(getText) }
}

/** У `<textarea>` атрибута `value` нет: на сервере текст — её содержимое. */
export function textareaText(getText: () => string | undefined): TTextareaText {
	if (isServer) {
		return {
			get textContent() {
				return getText()
			},
		}
	}

	return { ref: textRef<HTMLTextAreaElement>(getText) }
}
