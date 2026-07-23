import type { IContribution } from '@soldy/accessor'

export const FrameStylesContribution: IContribution = {
	props: [{ name: 'styles', protected: true, triggers: ['change:styles'] }],
}
