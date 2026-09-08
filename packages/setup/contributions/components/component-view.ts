import type { IContribution } from '@soldy/accessor'

/**
 * Слот по умолчанию есть у любого визуального слоя, поэтому объявлен здесь и
 * наследуется всеми потомками. Button его переопределяет, добавляя scope.
 */
export type TComponentViewSlots = {
	default: {}
}

export const ComponentViewContribution = (): IContribution => ({
	slots: {
		default: { description: 'Содержимое компонента' },
	},
	props: {
		rendered: { type: Boolean, triggers: ['change:rendered'] },
		visible: { type: Boolean, triggers: ['change:visible'] },
		present: {
			type: Boolean,
			protected: true,
			triggers: ['change:rendered', 'change:visible'],
		},
		tag: { type: [String, Object], triggers: ['change:tag'] },
		direction: { type: String, triggers: ['change:direction'] },
		dir: {
			type: String,
			protected: true,
			triggers: ['change:direction'],
		},
		classes: {
			type: Object,
			protected: true,
			triggers: ['change:classes'],
		},
		/**
		 * Как `classes`: protected-проп, который ядро держит объектом, а шаблон
		 * раскладывает спредом (`v-bind="aria"`). Адаптер читает снимок через
		 * `valueOf()`.
		 *
		 * Объявлен здесь, а не в Control, потому что ARIA нужна и
		 * неинтерактивным слоям: Icon скрывается через `aria-hidden`, Spinner
		 * объявляет себя как `status`.
		 *
		 * Триггер один. Раньше их приходилось перечислять объединением по всей
		 * цепочке наследования (`change:disabled`, `change:tag`, …), потому что
		 * набор вычислялся на лету и знать, что он устарел, было неоткуда.
		 * Теперь набор сам сообщает об изменении.
		 */
		aria: {
			type: Object,
			protected: true,
			triggers: ['change:aria'],
		},
		/**
		 * Парный к `aria` набор — `data-*` для темы.
		 *
		 * Имя `dataset`, а не `data`: во Vue `data` — опция компонента, и проп
		 * с таким именем читался бы в шаблоне двусмысленно. `dataset` вдобавок
		 * ровно то, как этот набор называет сам DOM.
		 */
		dataset: {
			type: Object,
			protected: true,
			triggers: ['change:dataset'],
		},
	},
	events: ['show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after', 'ready'],
})
