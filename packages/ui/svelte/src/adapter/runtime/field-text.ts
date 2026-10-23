/**
 * Текст поля на узле — свойством и только когда он разошёлся с узлом, как
 * `:value` у Vue: в спреде Svelte писал бы `value` на каждую смену, и запись
 * снимала бы с поля пометку «изменено пользователем». На сервере текст —
 * атрибутом `value`, у `<textarea>` — содержимым. AGENTS.md (Svelte),
 * «Текст поля».
 */

import { BROWSER } from 'esm-env'
import { createAttachmentKey, type Attachment } from 'svelte/attachments'

/** Спредом на `<input>`: в браузере — attachment, на сервере — `value`. */
export type TFieldText =
	| { readonly [key: symbol]: Attachment<HTMLInputElement> }
	| { readonly value: string | undefined }

export type TTextareaText = {
	/** Спредом на поле, последним: в браузере — attachment, на сервере — ничего. */
	readonly attributes: { readonly [key: symbol]: Attachment<HTMLTextAreaElement> }
	/** Атрибутом `value` в разметке: на сервере — текст, в браузере — `undefined`. */
	readonly value: string | undefined
}

function textAttachment<TNode extends HTMLInputElement | HTMLTextAreaElement>(
	getText: () => string | undefined,
): Attachment<TNode> {
	return (node) => {
		const text = getText() ?? ''

		if (node.value !== text) node.value = text
	}
}

/** Один раз на компонент: тот же ключ и та же функция узел не переставляют. */
export function fieldText(getText: () => string | undefined): TFieldText {
	if (!BROWSER) {
		return {
			get value() {
				return getText()
			},
		}
	}

	return { [createAttachmentKey()]: textAttachment<HTMLInputElement>(getText) }
}

/**
 * У `<textarea>` содержимым сервер Svelte делает только `value`, написанный в
 * разметке, а не в спреде, поэтому текст — отдельной частью.
 */
export function textareaText(getText: () => string | undefined): TTextareaText {
	if (!BROWSER) {
		return {
			attributes: {},
			get value() {
				return getText()
			},
		}
	}

	return {
		attributes: { [createAttachmentKey()]: textAttachment<HTMLTextAreaElement>(getText) },
		value: undefined,
	}
}
