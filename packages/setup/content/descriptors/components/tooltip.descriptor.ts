/**
 * Дескриптор Tooltip (TTooltip) — подсказка у триггера.
 *
 * Наследует ComponentViewDescriptor (rendered, visible, tag, наборы и плагины
 * element/ready) и добавляет открытость, сторону панели, задержки показа и
 * скрытия, сторону триггера в связке и плагины: нажатие мимо и то, когда
 * подсказка показывается и прячется.
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
						'Элемент, который подсказка описывает. aria-describedby для него — в scope',
				},
				default: { description: 'Текст подсказки' },
			},
			props: {
				open: { type: Boolean, triggers: ['change:open'] },
				placement: { type: String, triggers: ['change:placement'] },
				openDelay: { type: Number, triggers: ['change:openDelay'] },
				closeDelay: { type: Number, triggers: ['change:closeDelay'] },
				/**
				 * Сторона триггера в связке с панелью. Вычисляет ядро, шаблон
				 * раскладывает в scope слота `trigger`: оставь её в разметке — и
				 * формула `id` повторится в каждом из шести адаптеров.
				 *
				 * Значение постоянное — строится из `uid`. Триггер всё равно нужен:
				 * проп без триггеров адаптер считает pass-through и наружу не отдаёт.
				 * `bundle:create` — тот же приём, что `create` у
				 * `dismiss_ownerAttribute`.
				 */
				triggerAria: { type: Object, protected: true, triggers: ['bundle:create'] },
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
