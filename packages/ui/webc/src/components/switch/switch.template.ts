/**
 * Шаблон Switch.
 *
 * Корень — сам `<span is="so-switch">`: классы, `attrs` (`dir`) и скрытие
 * раскладывает на него база (`SoldyElement`). Здесь — поле и дорожка; внутри
 * корня только строчная разметка: переключатель кладут в подпись `Label`.
 *
 * - Поле — `<input type="checkbox">`, узел поля корня: на него база переносит
 *   статические атрибуты разметки корня, а шаблон кладёт `aria` ядра с
 *   `role="switch"` (`ownerAttributes`) и нативные `id`, `name`, `disabled` и
 *   `required`. Состояние скринридеру сообщает нативный `checked` — свойство
 *   узла: шаблон пишет его на смену значения ядра и только если узел с ним
 *   расходится. Переключает значение плагин по `change` поля.
 * - Дорожка — декор: `aria-hidden` не пускает содержимое слотов в доступное
 *   имя, которое переключателю даёт подпись. В ручке — слот `on` у
 *   включённого и `off` у выключенного: их выводит привязка (`showSlot`),
 *   неактивный — вне документа. Запасного содержимого нет: без слота ручка
 *   пуста.
 *
 * Scope у слотов нет, как у всех слотов Web Components: значение и инстанс
 * содержимое слота читает у элемента (`el.ctrl`).
 */

import type { ISwitch } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate } from '../../adapter'

/** Поле каждого переключателя — одно на всё время жизни элемента. */
const fields = new WeakMap<HTMLElement, HTMLInputElement>()

export const switchTemplate: ITemplate<ISwitch> = {
	create: (root) => {
		const { ownerDocument } = root
		const field = ownerDocument.createElement('input')
		const track = ownerDocument.createElement('span')
		const thumb = ownerDocument.createElement('span')

		field.type = 'checkbox'
		track.className = 'so-switch__track'
		track.setAttribute('aria-hidden', 'true')
		thumb.className = 'so-switch__track--thumb'
		track.appendChild(thumb)
		root.append(field, track)
		fields.set(root, field)

		return {
			slots: {
				on: { mode: 'append', node: thumb },
				off: { mode: 'append', node: thumb },
			},
			control: field,
		}
	},

	bindings: [
		// Нативные атрибуты поля фиксированного тега — проводка разметки
		bind(['id', 'name', 'disabled', 'required'], ({ root, state }) => {
			const field = fields.get(root)

			if (!field) return

			if (state.id === undefined) field.removeAttribute('id')
			else field.id = state.id

			field.name = state.name ?? ''
			field.disabled = state.disabled === true
			field.required = state.required === true
		}),

		bind('aria', ({ root, state }) => {
			const field = fields.get(root)

			if (field) ownerAttributes(field, state.aria)
		}),

		bind('value', ({ root, state, showSlot }) => {
			const field = fields.get(root)
			const checked = state.value === true

			// Свойство узла — только если он разошёлся с ядром: после клика
			// браузер уже поставил его сам
			if (field && field.checked !== checked) field.checked = checked

			showSlot('on', checked)
			showSlot('off', !checked)
		}),
	],
}
