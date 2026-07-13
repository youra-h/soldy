import { componentSchema } from './component.schema'
import type { IComponentViewProps, TComponentViewEvents } from '@soldy/core'
import { TElementPlugin, TInstancePlugin, TReadyBridgePlugin } from '@soldy/plugins'

export const componentViewSchema = componentSchema.extend<
	IComponentViewProps,
	TComponentViewEvents
>({
	props: {
		tag: {
			get: (i: any) => i.tag,
			set: (i: any, v: any) => {
				i.tag = v
			},
			triggers: ['change:tag'],
		},
	},

	derived: {
		classes: {
			get: (i: any) => i.classes.list,
			triggers: ['change:classes'],
		},
	},

	events: ['change:tag', 'change:classes', 'change:ready'],

	plugins: [TElementPlugin, TInstancePlugin, TReadyBridgePlugin],
})
