import type { IContribution } from '@soldy/accessor'

export const SpinnerStyleContribution: IContribution = {
	props: [{ name: 'styles', protected: true, triggers: ['change:styles'] }],
}
