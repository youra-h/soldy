/**
 * Вклад от core-компонента (TComponent).
 * Описывает свойства rendered, visible, present и события жизненного цикла.
 */

import type { IContribution } from '@soldy/provider'

export const ComponentContribution: IContribution = {
	props: [
		{ name: 'rendered', kind: 'state', triggers: ['change:rendered'] },
		{ name: 'visible', kind: 'state', triggers: ['change:visible'] },
		{ name: 'present', kind: 'computed', triggers: ['change:rendered', 'change:visible'] },
	],
	events: ['created', 'show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after'],
}
