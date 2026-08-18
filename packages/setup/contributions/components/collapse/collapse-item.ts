import type { IContribution } from '@soldy/accessor'

export const CollapseItemContribution: IContribution = {
	props: [{ name: '_view', type: String, protected: true, triggers: ['change:view'] }],
}
