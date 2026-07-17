/**
 * @soldy/host — contributions/component.contribution.ts
 *
 * Вклад от core-компонента (TComponent).
 * Описывает свойства rendered, visible, present и события жизненного цикла.
 */

import type { Contribution } from '../contract/Contribution'

export const componentContributionId = Symbol('component')

export const ComponentContribution: Contribution = {
	id: componentContributionId,
	members: [
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
		'change:rendered',
		'change:visible',
		'change:present',
	],
}
