import type { IContribution } from '@soldy/accessor'

export const FrameContribution: IContribution = {
	props: [
		{ name: 'x', triggers: ['change:x'] },
		{ name: 'y', triggers: ['change:y'] },
		{ name: 'width', triggers: ['change:width'] },
		{ name: 'height', triggers: ['change:height'] },
		{ name: 'position', triggers: ['change:position'] },
		{ name: 'target', triggers: ['change:target'] },
	],
	events: ['change:zIndex'],
}
