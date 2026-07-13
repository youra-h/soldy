import type { TComponentEvents, IComponentProps } from '@soldy/core'
import { createSchema } from '../schema'

/**
 * Базовый контракт Component.
 * Описывает общие для всех компонентов свойства и события.
 */
export const componentSchema = createSchema<IComponentProps, TComponentEvents>({
	props: {
		rendered: {
			get: (i) => i.rendered,
			set: (i, v) => {
				i.rendered = v
			},
			triggers: ['change:rendered'],
		},
		visible: {
			get: (i) => i.visible,
			set: (i, v) => {
				i.visible = v
			},
			triggers: ['change:visible'],
		},
	},

	computed: {
		present: {
			get: (i) => i.present,
			triggers: ['change:rendered', 'change:visible'],
		},
	},

	events: [
		// Property changes (публичный API, адаптер сам назовёт под фреймворк)
		'change:rendered',
		'change:visible',
		'change:present',
		// Actions
		'created',
		'show',
		'hide',
		'show:before',
		'show:after',
		'hide:before',
		'hide:after',
	],

	plugins: [],
})
