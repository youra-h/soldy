import type { IContribution } from '@soldy/provider'

export const ElementContribution: IContribution = {
	props: [{ name: 'element', mutable: false, public: false }],
	events: ['ready', 'removed'],
}
