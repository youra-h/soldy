/**
 * Вклад от плагина TElementPlugin.
 * Описывает свойство element и события ready/removed.
 */

import type { IContribution } from '@soldy/provider'
import { TElementPlugin } from '@soldy/plugins'

export const ElementContribution: IContribution = {
	ctor: TElementPlugin,
	props: [{ name: 'element', kind: 'state', mutable: false }],
	events: ['ready', 'removed'],
}
