import type { IContribution } from '@soldy/accessor'

export const FrameContribution = (): IContribution => ({
	props: [
		{ name: 'x', type: Number, triggers: ['change:x'] },
		{ name: 'y', type: Number, triggers: ['change:y'] },
		{ name: 'width', type: Number, triggers: ['change:width'] },
		{ name: 'height', type: Number, triggers: ['change:height'] },
		{ name: 'position', type: String, triggers: ['change:position'] },
		{ name: 'target', type: [Object, String], triggers: ['change:target'] },
	],
	events: ['change:zIndex'],
})
