/**
 * Дескриптор RadioGroup (TRadioGroup).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...) и добавляет `view`. Клавиатурного плагина нет: радио
 * нативные, и клавиатуру группы даёт браузер по общему `name` — стрелки,
 * пропуск выключенных, одну остановку Tab. Общий `name` раздаёт радио
 * `TRadioGroupNamePlugin`, радио он узнаёт от реестра bundles коллекции.
 *
 * Отметку полей после выбора пользователя возвращает к модели
 * `TRadioGroupCheckedPlugin`: выбор, отменённый в `item:activate:before`,
 * браузер уже отметил, а разметка поле не перерисует — модель не сменилась.
 * Поля радио он находит через реестр узлов коллекции (`TCollectionElements`).
 *
 * `value`, а не выбор элементов наружу: потребителю нужен ответ в значениях,
 * и он же уходит в форму. `view`, `size` и `variant` задаются группе, а тема
 * читает их с каждого радио — раздаёт их `TRadioGroupExtension`.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TRadioGroup } from '@soldy-ui/core'
import type { IRadioGroupItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	RadioGroupCheckedPluginDescriptor,
	RadioGroupNamePluginDescriptor,
} from '../../plugins'

export const RadioGroupDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TRadioGroup,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * `default` — радио группы: `RadioGroup.Item` где угодно внутри, хоть в
			 * строках чужого списка. `item` — подпись радио, когда их задали пропом
			 * `items`; слот статический и получает радио через scope — вместе со
			 * scope подписи радио (`active`).
			 */
			slots: {
				default: { description: 'Радио группы — компоненты RadioGroup.Item' },
				item: {
					scope: {
						item: defineType<IRadioGroupItem>(Object),
						active: defineType<boolean>(Boolean),
					},
					description: 'Подпись радио при работе через проп items',
				},
			},
			props: {
				view: { type: String, triggers: ['change:view'] },
			},
		},

		plugins: [
			// Коллекция: через реестр bundles плагины группы узнают её радио,
			// через реестр узлов — их поля
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Общий `name` радио — без него браузер не соберёт их в группу
			RadioGroupNamePluginDescriptor,
			// Отметка полей по модели: выбор, в котором коллекция отказала,
			// браузер уже отметил
			RadioGroupCheckedPluginDescriptor,
		],
	}),
)
