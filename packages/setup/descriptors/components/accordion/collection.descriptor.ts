/**
 * Дескрипторы коллекционной части Accordion — фасады владельца и элемента.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`AccordionDescriptor`, `AccordionItemDescriptor`): адаптер собирает компонент
 * из обоих рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TAccordionCollectionFacade, TAccordionItemCollectionFacade } from '@soldy/core'
import { CollectionDescriptor } from '../collection'

export const AccordionCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordionCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props/events владельца Accordion (выводятся фасадом TAccordionCollectionFacade).
		 */
		contribution: {
			props: {
				mode: { type: String, triggers: ['change:mode'] },
				selected: { type: Array, protected: true, triggers: ['change:selection'] },
			},
			events: [],
		},
	}),
)

export const AccordionCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordionItemCollectionFacade,
		/**
		 * Item-level пропсы элемента Accordion (выводятся фасадом TAccordionItemCollectionFacade).
		 */
		contribution: {
			props: {
				selected: { type: Boolean, triggers: ['change:selected'] },
				order: { type: Number, protected: true, triggers: ['change:order'] },
				view: {
					type: String,
					protected: true,
					triggers: ['change:view'],
				},
				/**
				 * Сторона панели в связке «заголовок ↔ панель». Сторона заголовка
				 * пишется прямо в `aria` элемента расширением `content`; панели писать
				 * некуда — своего компонента, а значит и набора, у неё нет.
				 */
				content_aria: { type: Object, protected: true, triggers: ['change:selected'] },
			},
		},
	}),
)
