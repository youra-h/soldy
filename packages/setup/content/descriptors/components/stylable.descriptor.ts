/**
 * Дескриптор Stylable (TStylable).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, variant.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import type { IComponentPropDefinition } from '../../../protected/define'
import { TStylable } from '@soldy-ui/core'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const StylableDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TStylable,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				size: { type: String, triggers: ['change:size'] },
				variant: { type: String, triggers: ['change:variant'] },
			},
		},
	}),
)

/**
 * Размер и вид, снятые с разметки, — для того, кому их диктует владелец.
 *
 * У элемента коллекции значение `size` и `variant` всегда владельца, как
 * элемент ни наполняй (AGENTS.md, «`size` и `variant` элемента: владельца, и
 * только его»). Вход разметки при этом обещал бы то, чего нет, поэтому
 * элементы подмешивают этот фрагмент: значение остаётся живым и читаемым,
 * задать его в разметке нельзя.
 *
 * Переобъявлен один факт — `protected`. Тип и триггеры объявлены выше, в
 * `StylableDescriptor`, там и остаются: наследник пишет только то, что меняет
 * (см. `TComponentDescriptor`, «переобъявление пропа»).
 *
 * `as const satisfies`: с одной аннотацией `protected` вывелся бы `boolean`, и
 * вычитание защищённых имён из типа пропсов (`DescriptorProps`) их бы не
 * увидело — вход остался бы в типе, хотя в рантайме его уже нет.
 */
export const OWNER_STYLE_PROPS = {
	size: { protected: true },
	variant: { protected: true },
} as const satisfies Record<string, IComponentPropDefinition>
