import type { IComponentView } from '@soldy/core'

/** События плагина накопления DOM-элементов */
export type TElementAccumulationEvents = {
	elementAdded: (payload: { uid: string | number; element: HTMLElement }) => void
	elementRemoved: (payload: { uid: string | number }) => void
	elementPresent: (payload: { uid: string | number; present: boolean }) => void
}

/** События плагина накопления инстансов */
export type TInstanceAccumulationEvents = {
	instanceAdded: (payload: { uid: string | number; instance: IComponentView }) => void
	instanceRemoved: (payload: { uid: string | number }) => void
}
