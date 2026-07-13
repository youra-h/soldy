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
			changed: 'change:tag',
		},
		classes: {
			get: (i: any) => i.classes.list,
			changed: 'change:classes',
		},
	},

	events: ['ready'],

	plugins: [TElementPlugin, TInstancePlugin, TReadyBridgePlugin],
})
