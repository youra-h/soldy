/**
 * @soldy/host — contributions/component.contribution.ts
 *
 * Вклад от core-компонента (TComponent).
 * Описывает свойства rendered, visible, present и события жизненного цикла.
 */

import type { IContribution } from '../contract/Contribution'

export const componentContributionId = Symbol('component')

export const ComponentContribution: IContribution = {
	id: componentContributionId,
	members: [
		{
			name: 'rendered',
			kind: 'state',
			mutable: true,
			ownerId: componentContributionId,
		},
		{
			name: 'visible',
			kind: 'state',
			mutable: true,
			ownerId: componentContributionId,
		},
		{
			name: 'present',
			kind: 'computed',
			mutable: false,
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
