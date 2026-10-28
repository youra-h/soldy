/**
 * Дескриптор AccordionItem (TAccordionItem).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет text, arrowPlacement, слоты заголовка и панели + коллекционные
 * item-пропсы (selected, order, view).
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TAccordionItem } from '@soldy-ui/core'
import type { IAccordionItem } from '@soldy-ui/core'
import { headerIn } from '@soldy-ui/plugins'
import { ValueControlDescriptor } from '../value-control.descriptor'
import { OWNER_STYLE_PROPS } from '../stylable.descriptor'
import {
	AccordionItemIdsPluginDescriptor,
	ActionPluginDescriptor,
	IdPluginDescriptor,
} from '../../plugins'

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
			 *
			 * Каждый слот несёт в scope и саму секцию (`item`): секция уже знает
			 * себя (проп `ctrl`) и отдаёт её слоту сама, как ячейка таблицы
			 * отдаёт слоту свою строку (`row`, `table/row/Cells.vue`). Поэтому
			 * владелец, рисующий секции из `items`, пробрасывает слоты как есть,
			 * без собственного ключа (сравни `RELAYS` в
			 * `setup/__tests__/item-slots.spec.ts`, запись с `key: null`) — и не
			 * обращается при этом к переменной своего цикла, иначе Vue
			 * перерисовывал бы все секции с каждой перерисовкой владельца
			 * (AGENTS.md, Pitfalls).
			 */
			slots: {
				default: {
					scope: { item: defineType<IAccordionItem>(Object) },
					description: 'Содержимое раскрывающейся панели',
				},
				'leading-icon': {
					scope: { item: defineType<IAccordionItem>(Object) },
					description:
						'Стрелка перед заголовком. По умолчанию — при arrowPlacement="start"',
				},
				leading: {
					scope: { item: defineType<IAccordionItem>(Object) },
					description: 'Перед текстом заголовка',
				},
				header: {
					scope: {
						item: defineType<IAccordionItem>(Object),
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Текст заголовка. Задано — переопределяет проп text',
				},
				trailing: {
					scope: { item: defineType<IAccordionItem>(Object) },
					description: 'После текста заголовка',
				},
				'trailing-icon': {
					scope: { item: defineType<IAccordionItem>(Object) },
					description: 'Стрелка после заголовка. По умолчанию — при arrowPlacement="end"',
				},
			},
			props: {
				// Размер и вид секции задаёт аккордеон: входы сняты
				...OWNER_STYLE_PROPS,
				text: { type: String, triggers: ['change:text'] },
				arrowPlacement: { type: String, triggers: ['change:arrowPlacement'] },
				/**
				 * Атрибуты панели. Набор секции, а не свой: панель лежит внутри
				 * секции и экземпляра у неё нет.
				 */
				contentAria: { type: Object, protected: true, triggers: ['change:contentAria'] },
			},
		},

		plugins: [
			// Фокус держит заголовок, а корень — обёртка заголовка и панели: туда
			// `focused = true` и ставит фокус
			ActionPluginDescriptor.with({ focusTarget: headerIn }),
			// Связка «заголовок ↔ панель»: `id` обеих и ссылки между ними; `id`
			// заголовка — проп `id` или от монтирования
			IdPluginDescriptor,
			AccordionItemIdsPluginDescriptor,
		],
	}),
)
