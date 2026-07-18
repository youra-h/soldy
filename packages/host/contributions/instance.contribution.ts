/**
 * @soldy/host — contributions/instance.contribution.ts
 *
 * Вклад от плагина TInstancePlugin.
 * Описывает свойство instance и события ready/removed.
 */

import type { Contribution } from '../contract/Contribution'
import { TInstancePlugin } from '@soldy/plugins'

export const InstanceContribution: Contribution = {
	id: TInstancePlugin.key,
	members: [
		{
			name: 'instance',
			kind: 'state',
			mutable: false,
			ownerId: TInstancePlugin.key,
		},
	],
	events: [],
}
