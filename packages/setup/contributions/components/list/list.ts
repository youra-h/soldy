import type { IContribution } from '@soldy/accessor'

export const ListContribution: IContribution = {
	props: [
		{ name: 'maxRows', triggers: ['change:maxRows'] },
		{ name: 'autoWidth', triggers: ['change:autoWidth'] },
		{ name: 'wordWrap', triggers: ['change:wordWrap'] },
		{ name: 'scrollBehavior', triggers: ['change:scrollBehavior'] },
	],
	events: [
		'item:disabled',
		'item:text',
		'item:rendered',
		'item:visible',
		'item:present',
	],
}
