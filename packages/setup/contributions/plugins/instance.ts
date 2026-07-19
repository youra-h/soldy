import type { IContribution } from '@soldy/provider'

export const InstanceContribution: IContribution = {
	props: [{ name: 'instance', kind: 'state', mutable: false }],
	events: [],
}
