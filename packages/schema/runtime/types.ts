/**
 * Интерфейс платформы адаптера.
 *
 * Каждый фреймворк (Vue, React, Solid, Angular, Svelte) предоставляет
 * свою реализацию этого интерфейса. Бизнес-логика адаптера не зависит
 * от конкретного фреймворка.
 */
export interface IAdapterPlatform {
	/** Эмитнуть изменение наружу (свойство или событие). */
	emit(notification: { type: 'property'; name: string; value: any } | { type: 'event'; name: string; args: any[] }): void

	/** Зарегистрировать очистку при уничтожении компонента. */
	onDispose(fn: () => void): void
}
