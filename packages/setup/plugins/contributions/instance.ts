/**
 * Вклад от плагина TInstancePlugin.
 * Описывает свойство instance.
 */

import type { IContribution } from '@soldy/provider'
import { TInstancePlugin } from '@soldy/plugins'

export const InstanceContribution: IContribution = {
	ctor: TInstancePlugin,
	props: [{ name: 'instance', kind: 'state', mutable: false }],
	events: [],
}
