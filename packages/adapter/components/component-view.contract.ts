import { componentContract } from './component.contract'
import type { TComponentViewEvents } from '@soldy/core'
import { TElementPlugin, TInstancePlugin, TReadyBridgePlugin } from '@soldy/plugins'

export const componentViewContract = componentContract.extend<TComponentViewEvents>({
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
		'change:ready',
	],

	plugins: [TElementPlugin, TInstancePlugin, TReadyBridgePlugin],
})
