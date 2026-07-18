/**
 * @soldy/host — contributions/element.contribution.ts
 *
 * Вклад от плагина TElementPlugin.
 * Описывает свойство element и события ready/removed.
 */

import type { Contribution } from '../contract/Contribution'
import { TElementPlugin } from '@soldy/plugins'

export const ElementContribution: Contribution = {
	id: TElementPlugin.key,
	members: [
		{
			name: 'element',
			kind: 'state',
			mutable: false,
			ownerId: TElementPlugin.key,
		},
	],
	events: ['ready', 'removed'],
}
