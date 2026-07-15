/**
 * Интерфейс платформы адаптера.
 *
 * Каждый фреймворк (Vue, React, Solid, Angular, Svelte) предоставляет
 * свою реализацию этого интерфейса. Бизнес-логика адаптера не зависит
 * от конкретного фреймворка.
 */
export interface IAdapterPlatform {
	/** Создать реактивную ячейку: getter + setter (Vue: customRef, React: useSyncExternalStore, Solid: createSignal). */
	createSignal<T>(get: () => T, set: (v: T) => void): void

	/** Подписаться на изменение внешнего props (Vue: watch, React: useEffect). */
	watchProp(name: string, onChange: (value: any) => void): void

	/** Эмитнуть событие наружу (Vue: emit, React: вызов коллбэка из props). */
	emit(name: string, ...args: any[]): void

	/** Зарегистрировать очистку при уничтожении компонента. */
	onDispose(fn: () => void): void
}
