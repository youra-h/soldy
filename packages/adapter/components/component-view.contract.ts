import { componentContract } from './component.contract'
import { TElementPlugin, TInstancePlugin, TReadyBridgePlugin } from '@soldy/plugins'

/**
 * Контракт ComponentView.
 * Расширяет базовый Component свойствами tag, classes и событием ready.
 */
export const componentViewContract = componentContract.extend({
	props: {
		tag: {
			get: (i: any) => i.tag,
			set: (i: any, v: any) => { i.tag = v },
			triggers: ['change:tag'],
		},
		classes: {
			get: (i: any) => i.classes.list,
			triggers: ['change:classes'],
		},
	},

	events: [
		'change:tag',
		'change:classes',
		'ready',
	],

	plugins: [TElementPlugin, TInstancePlugin, TReadyBridgePlugin],
})
