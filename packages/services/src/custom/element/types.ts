// services/custom/element/types.ts

export type TElementServiceEvents = {
	ready: (element: HTMLElement) => void
	removed: () => void
}
