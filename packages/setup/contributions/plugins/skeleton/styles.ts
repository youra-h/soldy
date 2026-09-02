import type { IContribution } from '@soldy/accessor'

export const SkeletonStylesContribution: IContribution = {
	props: [{ name: 'styles', protected: true, triggers: ['change:styles'] }],
}
