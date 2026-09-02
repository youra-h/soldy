import type { IContribution } from '@soldy/accessor'

export const SpinnerStylesContribution: IContribution = {
	props: [{ name: 'styles', protected: true, triggers: ['change:styles'] }],
}
