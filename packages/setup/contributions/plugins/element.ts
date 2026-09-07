import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

export const ElementContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS, 'ready', 'removed'],
})
