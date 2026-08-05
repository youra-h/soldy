export type TActivationEvents<T> = {
	'change:activation': (item: T | undefined) => void
	'item:activated': (item: T) => void
	'item:deactivated': (item: T | undefined) => void
}
