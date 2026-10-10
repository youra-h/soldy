/**
 * Действие формы — то, что `<button>` делает со своей формой при нажатии, для
 * элемента, связанного с формой (`formAssociated`).
 *
 * Корень — сам хост (`<so-button>`), а не нативная кнопка, поэтому отправку
 * и сброс браузер за него не сделает: их выбирает эта реакция по атрибуту
 * `type` хоста, без учёта регистра, как у `<button>`:
 *
 * - `reset` — сбрасывает форму;
 * - `button` — ничего не делает;
 * - остальное, и атрибута нет, — отправка. Отправка по умолчанию — как у
 *   `<Button>` во Vue и React: там корень — `<button>` без `type`.
 *
 * Отправляет `requestSubmit()`: форма проверяет поля и шлёт `submit`, который
 * можно отменить, — как при нажатии нативной кнопки. Отправитель (`submitter`)
 * в событие не попадает, а `name` и `value` элемента — в данные формы:
 * `requestSubmit` принимает отправителем только нативную кнопку.
 *
 * Форма — `ElementInternals.form` из контекста реакции: и форма-предок, и
 * форма из атрибута `form`. Формы нет — действия нет.
 */

import type { ITemplateReactionContext } from './types'

export function formAction({ root, form }: ITemplateReactionContext): void {
	if (!form) return

	const type = root.getAttribute('type')?.toLowerCase()

	if (type === 'reset') {
		form.reset()
	} else if (type !== 'button') {
		form.requestSubmit()
	}
}
