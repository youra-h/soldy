import type { TAria } from '../../../common'

/**
 * Обязательность и «только для чтения» текстового поля в ARIA — одно правило
 * у полей, чей `aria` стоит на вложенном `<input>`: Input и поле числа.
 *
 * На теге `input` `required` и `readonly` нативные — браузер сам сообщает о
 * них скринридеру, дублировать в ARIA не нужно. Исключение — `required` на
 * `readonly`-поле: браузер такое поле не валидирует, нативный `required` на
 * нём бессмыслен, и без явного `aria-required` состояние останется немым.
 *
 * Решает тег элемента с `aria` (`ariaTag`), а не корня: дубль встал бы рядом
 * с нативным атрибутом на том же вложенном `<input>`.
 */
export function syncTextFieldAria(
	aria: TAria,
	ariaTag: string,
	required: boolean,
	readonly: boolean,
): void {
	const isNativeTag = ariaTag.toLowerCase() === 'input'

	aria.add('aria-required', required && (!isNativeTag || readonly) ? 'true' : null)
	aria.add('aria-readonly', readonly && !isNativeTag ? 'true' : null)
}
