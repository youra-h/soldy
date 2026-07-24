import { provide, inject, type InjectionKey } from 'vue'

export const DRAG_CONTEXT_KEY: InjectionKey<boolean> = Symbol('drag-context')

/**
 * @deprecated Используйте VueElevator с ключом DRAG_CONTEXT_ELEVATOR из adapter/elevator-keys.
 * Будет удалено после миграции Collection на useAdapter.
 */
export function useProvideDragContext(): void {
	provide(DRAG_CONTEXT_KEY, true)
}

/**
 * @deprecated Используйте VueElevator с ключом DRAG_CONTEXT_ELEVATOR из adapter/elevator-keys.
 * Будет удалено после миграции Collection на useAdapter.
 */
export function useInjectDragContext(): boolean {
	return inject(DRAG_CONTEXT_KEY, false)
}
