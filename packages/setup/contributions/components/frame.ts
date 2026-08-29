import type { IContribution } from '@soldy/accessor'

export const FrameContribution = (): IContribution => ({
	props: {
		x: { type: Number, triggers: ['change:x'] },
		y: { type: Number, triggers: ['change:y'] },
		width: { type: Number, triggers: ['change:width'] },
		height: { type: Number, triggers: ['change:height'] },
		position: { type: String, triggers: ['change:position'] },
		target: { type: [Object, String], triggers: ['change:target'] },
	},
	events: ['change:zIndex'],
})
