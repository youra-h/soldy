/**
 * Дескриптор Virtual (TVirtual) — окно для длинных списков.
 *
 * Наследует ComponentDescriptor (невизуальная база), как DragAndDrop, и
 * добавляет выключатель `enabled` и слот по умолчанию. Окно коллекциям внутри
 * обёртки ставит её проводка (`TVirtualExtension`), а подхватывают его
 * коллекции своим расширением (`TVirtualCollectionExtension`).
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TVirtual } from '@soldy-ui/core'
import { ComponentDescriptor } from './component.descriptor'

export const VirtualDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TVirtual,

		extends: ComponentDescriptor(),

		contribution: {
			props: {
				/**
				 * Окно включено: коллекции внутри рисуют только видимые элементы.
				 * Выключено — рисуют все, как без обёртки
				 */
				enabled: { type: Boolean, triggers: ['change:enabled'] },
			},
			/**
			 * Своего узла у компонента нет: разметка — один слот, и окно получают
			 * коллекции внутри него. Слот объявлен здесь, а не взят у
			 * ComponentView: визуального слоя у Virtual нет.
			 */
			slots: {
				default: { description: 'Коллекции, которые рисуют только видимые элементы' },
			},
		},
	}),
)
