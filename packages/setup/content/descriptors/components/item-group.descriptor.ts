/**
 * Дескриптор ItemGroup (TItemGroup) — группа элементов под общей подписью,
 * общая база `Menu.Group`, `ListBox.Group` и `Select.Group`.
 *
 * Наследует ComponentViewDescriptor и добавляет подпись, набор подписи и
 * плагин связок: имя группы — её подпись (`aria-labelledby`). Плагин один на
 * три формы, поэтому стоит здесь, а не у каждой.
 *
 * Слота подписи нет: он назывался бы как проп `label`, а слот с именем пропа
 * слился бы с ним в React, Solid и Svelte. Подпись — текст пропа. Слот
 * элементов (`default`) объявляет каждая форма сама: своей разметки у базы нет
 * ни в одном адаптере, а слоты не наследуются.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TItemGroup } from '@soldy-ui/core'
import { ComponentViewDescriptor } from './component-view.descriptor'
import { ItemGroupIdsPluginDescriptor } from '../plugins'

export const ItemGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TItemGroup,

		extends: ComponentViewDescriptor(),

		contribution: {
			props: {
				label: { type: String, triggers: ['change:label'] },
				/**
				 * Набор подписи — разметки внутри группы без своего экземпляра.
				 * `id` в него пишет `TItemGroupIdsPlugin`, роль — форма группы.
				 */
				labelAria: { type: Object, protected: true, triggers: ['change:labelAria'] },
			},
		},

		plugins: [ItemGroupIdsPluginDescriptor],
	}),
)
