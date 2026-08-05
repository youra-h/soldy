export type TBatchEvents<T> = {
	'items:added': (items: T[]) => void
	'items:removed': (items: T[]) => void
}
