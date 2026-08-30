import type { IContribution } from '@soldy/accessor'

export const ListContribution = (): IContribution => ({
	props: {
		maxRows: { type: Number, triggers: ['change:maxRows'] },
		autoWidth: { type: Boolean, triggers: ['change:autoWidth'] },
		wordWrap: { type: Boolean, triggers: ['change:wordWrap'] },
		scrollBehavior: { type: String, triggers: ['change:scrollBehavior'] },
	},
})
