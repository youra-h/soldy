/**
 * Дескриптор AccordionItem (TAccordionItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет text, arrowPlacement, слоты заголовка и панели + коллекционные
 * item-пропсы (selected, order, view).
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TAccordionItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'

export const AccordionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordionItem,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * Слот по умолчанию — панель: она лежит внутри секции и отдельно от
			 * неё не существует. Текст заголовка поэтому не `default`, но и не
			 * `content` — содержимым у аккордеона называется панель
			 * (`item-content` у владельца), — а `header`. С пропом `text` имя
			 * слота не совпадает (AGENTS.md, «Слоты — третья категория
			 * контракта»).
			 *
			 * Стрелка — по краю заголовка, со стороны `arrowPlacement`; слоты
			 * `leading-icon` и `trailing-icon` подменяют её в одном месте, по
			 * умолчанию она берётся из пакета иконок по роли `arrowRight`
			 * (см. `ICON_ROLES`).
			 */
			slots: {
				default: { description: 'Содержимое раскрывающейся панели' },
				'leading-icon': {
					description:
						'Стрелка перед заголовком. По умолчанию — при arrowPlacement="start"',
				},
				leading: { description: 'Перед текстом заголовка' },
				header: {
					scope: {
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Текст заголовка. Задано — переопределяет проп text',
				},
				trailing: { description: 'После текста заголовка' },
				'trailing-icon': {
					description: 'Стрелка после заголовка. По умолчанию — при arrowPlacement="end"',
				},
			},
			props: {
				// Размер и вид секции задаёт аккордеон: входы сняты
				...OWNER_STYLE_PROPS,
				text: { type: String, triggers: ['change:text'] },
				arrowPlacement: { type: String, triggers: ['change:arrowPlacement'] },
			},
		},
	}),
)
