/**
 * Дескриптор Tooltip (TTooltip) — подсказка у триггера.
 *
 * Наследует ComponentViewDescriptor (rendered, visible, tag, наборы и плагины
 * element/ready) и добавляет открытость, сторону панели, задержки показа и
 * скрытия, режим связки (описание или имя), сторону триггера в связке и
 * плагины: нажатие мимо и то, когда подсказка показывается и прячется.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TTooltip } from '@soldy-ui/core'
import type { TAriaAttributes } from '@soldy-ui/core'
import { DismissPluginDescriptor, TooltipTriggerPluginDescriptor } from '../plugins'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const TooltipDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTooltip,

		extends: ComponentViewDescriptor(),

		contribution: {
			/**
			 * Триггер — слот внутри корня, как у Popover: корень служит панели
			 * якорем и целью наведения. Своей ARIA у содержимого слота нет,
			 * поэтому ссылку на панель компонент отдаёт ему в scope.
			 */
			slots: {
				trigger: {
					scope: { triggerAria: defineType<TAriaAttributes>(Object) },
					description:
						'Элемент, который подсказка описывает или называет. Ссылка на панель для него — в scope',
				},
				default: { description: 'Текст подсказки' },
			},
			props: {
				open: { type: Boolean, triggers: ['change:open'] },
				placement: { type: String, triggers: ['change:placement'] },
				openDelay: { type: Number, triggers: ['change:openDelay'] },
				closeDelay: { type: Number, triggers: ['change:closeDelay'] },
				/** Описание (`aria-describedby`) или имя (`aria-labelledby`) триггера. */
				type: { type: String, triggers: ['change:type'] },
				/**
				 * Сторона триггера в связке с панелью. Вычисляет ядро, шаблон
				 * раскладывает в scope слота `trigger`: оставь её в разметке — и
				 * формула `id` и выбор атрибута по режиму повторятся в каждом из
				 * шести адаптеров.
				 *
				 * `id` постоянный — строится из `uid`, а атрибут ссылки меняет
				 * режим: набор перечитывается на `change:type`.
				 */
				triggerAria: { type: Object, protected: true, triggers: ['change:type'] },
			},
		},

		plugins: [
			// Нажатие мимо закрывает и помечает панель владельцем. Без
			// `focusOutside`: уход фокуса ведёт плагин подсказки — фокус в панель
			// не уходит, и мимо него уходит только с триггера
			DismissPluginDescriptor,
			// Наведение, фокус с клавиатуры, нажатие и Escape. После dismiss:
			// берёт у него панель
			TooltipTriggerPluginDescriptor,
		],
	}),
)
