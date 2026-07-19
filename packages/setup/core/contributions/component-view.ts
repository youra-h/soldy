/**
 * Вклад от core-компонента TComponentView.
 * Описывает свойства tag и classes.
 */

import type { IContribution } from '@soldy/provider'
import { TComponentView } from '@soldy/core'

export const ComponentViewContribution: IContribution = {
	ctor: TComponentView,
	props: [
		{ name: 'tag', kind: 'state', triggers: ['change:tag'] },
		{ name: 'classes', kind: 'computed', triggers: ['change:classes'] },
	],
	events: ['ready'],
}
