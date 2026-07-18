/**
 * @soldy/host — contributions/element.contribution.ts
 *
 * Вклад от плагина TElementPlugin.
 * Описывает свойство element и события ready/removed.
 */

import type { IContribution } from '../contract'
import { TElementPlugin } from '@soldy/plugins'

export const ElementContribution: IContribution = {
	id: TElementPlugin.key,
	props: [
		{
			name: 'element',
			kind: 'state',
			mutable: false,
			ownerId: TElementPlugin.key,
		},
	],
	events: ['ready', 'removed'],
}
