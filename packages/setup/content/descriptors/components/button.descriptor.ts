/**
 * Дескриптор Button (TButton).
 *
 * Наследует TextableDescriptor (text, disabled, focused, size, variant, ...)
 * и добавляет view.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TButton } from '@soldy-ui/core'
import { TextableDescriptor } from './textable.descriptor'

export const ButtonDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TButton,

		extends: TextableDescriptor(),

		contribution: {
			props: {
				view: { type: String, triggers: ['change:view'] },
			},
			slots: {
				leading: { description: 'Перед текстом' },
				default: {
					// Компонент отдаёт наружу свой text, чтобы содержимое могло его
					// использовать. Содержимое при этом любое — хоть таблица.
					scope: { text: defineType<string>(String) },
					description: 'Содержимое кнопки. Задано — переопределяет проп text',
				},
				trailing: { description: 'После текста' },
			},
		},
	}),
)
