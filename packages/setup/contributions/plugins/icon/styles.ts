import type { IContribution } from '@soldy/accessor'

export const IconStylesContribution: IContribution = {
	props: [{ name: 'styles', protected: true, triggers: ['change:styles'] }],
}
