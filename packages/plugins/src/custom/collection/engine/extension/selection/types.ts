export type TSelectionMode = 'none' | 'single' | 'multiple'

export type TSelectionEvents<T> = {
	'change:selection': (items: T[]) => void
	'change:mode': (value: TSelectionMode) => void
}
