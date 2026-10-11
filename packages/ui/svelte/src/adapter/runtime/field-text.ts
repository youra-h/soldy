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
 * стиль корня (`root-style.svelte.ts`).
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
 * Текст поля по геттеру `getText` — один раз на компонент: attachment с тем
 * же ключом и той же функцией Svelte на узле не переставляет.
 */
export function fieldText(getText: () => string | undefined): TFieldText {
	if (!BROWSER) {
		return {
			get value() {
				return getText()
			},
		}
	}

	return {
		[createAttachmentKey()]: (node: HTMLInputElement) => {
			const text = getText() ?? ''

			if (node.value !== text) node.value = text
		},
	}
}
