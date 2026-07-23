import type { IContribution } from '@soldy/accessor'

export const InputControlContribution: IContribution = {
	props: [
		{ name: 'readonly', triggers: ['change:readonly'] },
		{ name: 'required', triggers: ['change:required'] },
	],
}
