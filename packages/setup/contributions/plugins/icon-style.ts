import type { IContribution } from '@soldy/provider'

export const IconStyleContribution: IContribution = {
	props: [{ name: 'styles', kind: 'computed', triggers: ['change:styles'] }],
	events: ['change:styles'],
}
