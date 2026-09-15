// plugins/custom/input-bool/types.ts

import type { TPluginEvents } from '../../base'

export type TInputBoolPluginEvents = TPluginEvents & {
	'change:value': (payload: { value: boolean | undefined }) => void
}
