/**
 * Текст поля на узле — свойством, и только когда он разошёлся с узлом, как
 * `:value` у Vue и поле адаптера React.
 *
 * Наборы ядра и атрибуты потребителя ложатся на `<input>` поля спредом, а в
 * спреде Svelte пишет `value` на каждую смену значения, с узлом не сверяя
 * (`set_attributes`). Набранный текст плагин ввода несёт в ядро, ядро — в
 * разметку, и спред записал бы узлу его же текст на каждое нажатие: запись
 * из кода снимает с поля пометку «изменено пользователем», и браузер
 * перестаёт проверять `minlength` и `maxlength`, а набор через IME она могла
 * бы прервать. Без спреда Svelte сверяет текст с узлом сам (`set_value`), но
 * без спреда наборы на поле не положить.
 *
 * Поэтому `value` в спред поля не идёт, а текст ставит attachment поля: он
 * выполняется в эффекте и перечитывает значение при каждой его смене, а пишет
 * в узел, только когда оно разошлось с узлом. Набор узлу его же текст не
 * вернёт, значение из кода дойдёт и после набора, а перерисовка без смены
 * значения узел не трогает вовсе. `undefined` — пустое поле, как у Vue.
 *
 * На сервере attachment-ов нет, и текст уходит атрибутом `value`: его берёт
 * геттер на отрисовке. Сервер от браузера отличает `BROWSER` из `esm-env`, как
 * стиль корня (`root-style.svelte.ts`). У `<textarea>` атрибута `value` нет:
 * её текст на сервере — содержимое (`textareaText`).
 *
 * Отметку и «выбрано частично» флажка Svelte и в спреде пишет свойствами: их
 * запись, совпавшая с узлом, ничего у поля не снимает.
 */

import { BROWSER } from 'esm-env'
import { createAttachmentKey, type Attachment } from 'svelte/attachments'

/**
 * Атрибуты `<input>` для текста поля — спредом на поле: в браузере
 * attachment под своим ключом, на сервере — `value`.
 */
export type TFieldText =
	| { readonly [key: symbol]: Attachment<HTMLInputElement> }
	| { readonly value: string | undefined }

/**
 * Текст `<textarea>` — двумя частями разметки поля: спредом и атрибутом
 * `value`, — см. `textareaText`.
 */
export type TTextareaText = {
	/** Спредом на поле, последним: в браузере — attachment, на сервере — ничего. */
	readonly attributes: { readonly [key: symbol]: Attachment<HTMLTextAreaElement> }
	/** Атрибутом `value` поля: на сервере — текст, в браузере — `undefined`. */
	readonly value: string | undefined
}

/**
 * Attachment поля, который ведёт его текст: пишет в узел, только когда текст
 * разошёлся с узлом.
 */
function textAttachment<TNode extends HTMLInputElement | HTMLTextAreaElement>(
	getText: () => string | undefined,
): Attachment<TNode> {
	return (node) => {
		const text = getText() ?? ''

		if (node.value !== text) node.value = text
	}
}

/**
 * Текст поля `<input>` по геттеру `getText` — один раз на компонент:
 * attachment с тем же ключом и той же функцией Svelte на узле не переставляет.
 */
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
 * Текст поля `<textarea>` по геттеру `getText` — один раз на компонент.
 *
 * В браузере — тот же attachment, что у `<input>` (`attributes`), а атрибут
 * `value` пуст: `undefined` в спреде Svelte не пишет. На сервере текст у
 * `<textarea>` — её содержимое, и сервер Svelte делает содержимым только
 * атрибут `value`, написанный в разметке: из спреда он ушёл бы атрибутом,
 * которого у `<textarea>` нет, и поле в разметке сервера было бы пустым.
 * Поэтому текст — отдельной частью, `value`, а разметка пишет его атрибутом
 * поля. При гидратации Svelte снимает содержимое сервера, а attachment
 * возвращает текст в узел.
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
