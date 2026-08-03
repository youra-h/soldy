// plugins/custom/input-bool/types.ts

export type TInputBoolPluginEvents = {
	'change:value': (payload: { value: boolean | undefined }) => void
}
