/**
 * Вклад от плагина TElementPlugin.
 * Описывает свойство element и события ready/removed.
 */

import type { IContribution } from '@soldy/provider'

export const ElementContribution: IContribution = {
	props: [{ name: 'element', kind: 'state', mutable: false }],
	events: ['ready', 'removed'],
}
