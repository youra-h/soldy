import { createContract } from './contract'

/**
 * Базовый контракт Component.
 * Описывает общие для всех компонентов свойства и события.
 */
export const componentContract = createContract({
	props: {
		rendered: {
			get: (i) => i.rendered,
			set: (i, v) => { i.rendered = v },
			changed: 'change:rendered',
		},
		visible: {
			get: (i) => i.visible,
			set: (i, v) => { i.visible = v },
			changed: 'change:visible',
		},
		present: {
			get: (i) => i.present,
			changed: 'change:present',
		},
	},

	events: [
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
