import type { IContribution } from '@soldy/accessor'

/**
 * Коллекционные props/events владельца Accordion (выводятся фасадом TAccordionCollectionFacade).
 */
export const AccordionCollectionContribution = (): IContribution => ({
	props: {
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
	},
	events: [],
})

/**
 * Item-level пропсы элемента Accordion (выводятся фасадом TAccordionItemCollectionFacade).
 */
export const AccordionCollectionItemContribution = (): IContribution => ({
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
})
