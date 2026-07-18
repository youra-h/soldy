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
		{
			name: 'rendered',
			kind: 'state',
			ownerId: componentContributionId,
		},
		{
			name: 'visible',
			kind: 'state',
			ownerId: componentContributionId,
		},
		{
			name: 'present',
			kind: 'computed',
			ownerId: componentContributionId,
		},
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
