/**
 * @soldy/host — contributions/instance.contribution.ts
 *
 * Вклад от плагина TInstancePlugin.
 * Описывает свойство instance и события ready/removed.
 */

import type { Contribution } from '../contract/Contribution'

export const instanceContributionId = Symbol('instance')

export const InstanceContribution: Contribution = {
	id: instanceContributionId,
	members: [
		{
			name: 'instance',
			kind: 'state',
			mutable: false,
			ownerId: instanceContributionId,
		},
	],
	events: ['ready', 'removed'],
}
