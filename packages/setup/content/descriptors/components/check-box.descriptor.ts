/**
 * Дескриптор CheckBox (TCheckBox).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...),
 * сужает value до булева и добавляет indeterminate, view, слоты отметки `icon` и
 * `indeterminate-icon` + плагин InputBool.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TCheckBox } from '@soldy-ui/core'
import { InputBoolPluginDescriptor } from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const CheckBoxDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TCheckBox,

		extends: InputControlDescriptor(),

		contribution: {
			/**
			 * Подмена отметки в одном месте; по умолчанию она берётся из пакета
			 * иконок по ролям `check` и `checkIndeterminate` (см. `ICON_ROLES`).
			 * Коробка вокруг слотов остаётся за компонентом: она уносит отметку
			 * из доступного имени, которое чекбоксу даёт подпись.
			 */
			slots: {
				icon: {
					scope: {
						value: defineType<boolean | undefined>(Boolean),
						indeterminate: defineType<boolean>(Boolean),
					},
					description: 'Отметка выбранного чекбокса',
				},
				'indeterminate-icon': {
					scope: {
						value: defineType<boolean | undefined>(Boolean),
						indeterminate: defineType<boolean>(Boolean),
					},
					description: 'Отметка частично выбранного чекбокса',
				},
			},
			props: {
				/**
				 * Значение переобъявлено типом: отмечен или нет, как у ядра. Тип
				 * полей (ValueControl) начинается со строки, и с ним атрибут
				 * `value` без значения оставался пустой строкой, а не отмечал
				 * чекбокс. Триггер остаётся у ValueControl.
				 */
				value: { type: Boolean },
				indeterminate: { type: Boolean, triggers: ['change:indeterminate'] },
				view: { type: String, triggers: ['change:view'] },
			},
		},

		plugins: [InputBoolPluginDescriptor],
	}),
)
