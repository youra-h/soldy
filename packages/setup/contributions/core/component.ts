/**
 * @soldy/setup — contributions/core/component.ts
 *
 * Вклад от core-компонента (TComponent).
 * Описывает свойства rendered, visible, present и события жизненного цикла.
 */

import type { IContribution } from '@soldy/provider'

export const componentContributionId = Symbol('component')

export const ComponentContribution: IContribution = {
	id: componentContributionId,
	props: [
		{ name: 'rendered', kind: 'state' },
		{ name: 'visible', kind: 'state' },
		{ name: 'present', kind: 'computed' },
	],
	events: [
		'created',
		'show',
		'hide',
		'show:before',
		'show:after',
		'hide:before',
		'hide:after',
	],
}
