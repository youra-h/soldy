import type { IContribution } from '@soldy/accessor'

export const InputControlContribution: IContribution = {
	props: [
		{ name: 'readonly', type: Boolean, triggers: ['change:readonly'] },
		{ name: 'required', type: Boolean, triggers: ['change:required'] },
	],
}
