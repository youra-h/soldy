import type { IContribution } from '@soldy/accessor'

export const IconStylesContribution: IContribution = {
	props: [{ name: 'styles', type: Object, protected: true, triggers: ['change:styles'] }],
}
