/**
 * @soldy/provider — contributions/instance.contribution.ts
 *
 * Вклад от плагина TInstancePlugin.
 * Описывает свойство instance и события ready/removed.
 */

import type { IContribution } from '../contract'
import { TInstancePlugin } from '@soldy/plugins'

export const InstanceContribution: IContribution = {
	id: TInstancePlugin.key,
	props: [
		{
			name: 'instance',
			kind: 'state',
			mutable: false,
			ownerId: TInstancePlugin.key,
		},
	],
	events: [],
}
