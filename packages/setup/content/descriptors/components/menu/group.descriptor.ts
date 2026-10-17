/**
 * Дескриптор группы меню (TMenuGroup) — пункты под общей подписью.
 *
 * Наследует ComponentViewDescriptor и добавляет подпись, набор подписи и
 * плагин связок: имя группы — её подпись (`aria-labelledby`).
 *
 * Слота подписи нет: он назывался бы как проп `label`, а слот с именем пропа
 * слился бы с ним в React, Solid и Svelte. Подпись — текст пропа.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TMenuGroup } from '@soldy-ui/core'
import { ComponentViewDescriptor } from '../component-view.descriptor'
import { MenuGroupIdsPluginDescriptor } from '../../plugins'

export const MenuGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TMenuGroup,

		extends: ComponentViewDescriptor(),

		contribution: {
			slots: {
				default: { description: 'Пункты группы' },
			},
			props: {
				label: { type: String, triggers: ['change:label'] },
				/**
				 * Набор подписи — разметки внутри группы без своего экземпляра.
				 * `id` в него пишет `TMenuGroupIdsPlugin`.
				 */
				labelAria: { type: Object, protected: true, triggers: ['change:labelAria'] },
			},
		},

		plugins: [MenuGroupIdsPluginDescriptor],
	}),
)
