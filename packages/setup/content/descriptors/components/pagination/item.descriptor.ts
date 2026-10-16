/**
 * Дескриптор PaginationItem (TPaginationItem) — страница пагинации.
 *
 * Внутренняя часть, как тост у Toasts: страницу в разметку не ставят, её
 * рисует пагинация, по одной на место окна, и наружу адаптеров она не
 * выходит (см. «Часть или слот»).
 *
 * Наследует `StylableDescriptor`, а не `ControlDescriptor`, как день
 * календаря: входов у страницы нет. Ключ и текст кладёт в коллекцию
 * расширение пагинации, «выключена», размер и вариант — пагинации; всё это
 * только читается, поэтому объявлено защищённым. Защищены и `name` с
 * `focused` класса: ни в форму, ни в фокус разметка их не пишет. Плагины
 * Control странице не нужны: нажатие — активация коллекции из разметки, имя —
 * её текст.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TPaginationItem } from '@soldy-ui/core'
import { OWNER_STYLE_PROPS, StylableDescriptor } from '../stylable.descriptor'

export const PaginationItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TPaginationItem,

		extends: StylableDescriptor(),

		contribution: {
			slots: {
				default: {
					scope: { text: defineType<string>(String) },
					description: 'Содержимое страницы. Без него — номер или текст страницы',
				},
			},
			props: {
				// Размер и вариант страницы — пагинации: входы сняты
				...OWNER_STYLE_PROPS,
				disabled: { type: Boolean, protected: true, triggers: ['change:disabled'] },
				focused: { type: Boolean, protected: true, triggers: ['change:focused'] },
				value: { type: [String, Number], protected: true, triggers: ['change:value'] },
				name: { type: String, protected: true, triggers: ['change:name'] },
				text: { type: String, protected: true, triggers: ['change:text'] },
			},
		},
	}),
)
