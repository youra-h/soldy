/**
 * Дескриптор Label (TLabel) — подпись контрола.
 *
 * Наследует StylableDescriptor (rendered, visible, tag, size, variant, ...)
 * и добавляет text, position, слот text + плагин-предупреждение о вложенном
 * `label`. Своего `disabled` у подписи нет: состояние у контрола.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TLabel } from '@soldy/core'
import { LabelNestedWarnPluginDescriptor } from '../plugins'
import { StylableDescriptor } from './stylable.descriptor'

export const LabelDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TLabel,

		extends: StylableDescriptor(),

		contribution: {
			// Оба слота лежат внутри корня-`label`: контрол — его первый
			// labelable-потомок, а текст становится доступным именем контрола
			slots: {
				default: {
					description: 'Контрол: CheckBox, Switch или RadioGroup.Item с tag="span"',
				},
				text: { description: 'Текст подписи. Без слота — проп text' },
			},
			props: {
				text: { type: String, triggers: ['change:text'] },
				position: { type: String, triggers: ['change:position'] },
			},
		},

		// `label` в `label` HTML запрещает, а корень радио — `label`
		plugins: [LabelNestedWarnPluginDescriptor],
	}),
)
