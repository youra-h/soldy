import type { TPluginEvents } from '../../base'

export type TIdPluginEvents = TPluginEvents & {
	/** change:id — `id` узла сменился; `undefined` — снят */
	'change:id': (value: string | undefined) => void
}
