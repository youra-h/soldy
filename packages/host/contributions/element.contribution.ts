/**
 * @soldy/host — contributions/element.contribution.ts
 *
 * Вклад от плагина TElementPlugin.
 * Описывает свойство element и события ready/removed.
 */

import type { Contribution } from '../contract/Contribution'

export const elementContributionId = Symbol('element')

export const ElementContribution: Contribution = {
	id: elementContributionId,
	members: [
		{
			name: 'element',
			kind: 'state',
			ownerId: elementContributionId,
		},
	],
	events: ['ready', 'removed'],
}
