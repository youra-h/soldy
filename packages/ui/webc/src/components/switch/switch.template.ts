/**
 * Шаблон Switch: поле с `aria` ядра (`role="switch"`) и дорожка под
 * `aria-hidden` — слоты ручки не попадают в имя от подписи. В ручке — слот `on`
 * или `off` по значению.
 */

import type { ISwitch } from '@soldy-ui/core'
import type { TSwitchOutputs } from './setup.component'
import { bind, ownerAttributes, type ITemplate } from '../../adapter'

/** Поле каждого переключателя — одно на всё время жизни элемента. */
const fields = new WeakMap<HTMLElement, HTMLInputElement>()

export const switchTemplate: ITemplate<ISwitch, unknown, TSwitchOutputs> = {
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
