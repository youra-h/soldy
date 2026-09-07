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
	},
	events: ['show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after', 'ready'],
})
