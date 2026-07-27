import type { IContribution } from '@soldy/accessor'

export const ListContribution: IContribution = {
	props: [
		{ name: 'maxRows', type: Number, triggers: ['change:maxRows'] },
		{ name: 'autoWidth', type: Boolean, triggers: ['change:autoWidth'] },
		{ name: 'wordWrap', type: Boolean, triggers: ['change:wordWrap'] },
		{ name: 'scrollBehavior', type: String, triggers: ['change:scrollBehavior'] },
	],
	events: [
		'item:disabled',
		'item:text',
		'item:rendered',
		'item:visible',
		'item:present',
	],
}
