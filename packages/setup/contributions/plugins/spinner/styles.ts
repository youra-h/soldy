import type { IContribution } from '@soldy/accessor'

export const SpinnerStylesContribution: IContribution = {
	props: [{ name: '_styles', protected: true, triggers: ['change:styles'] }],
}
