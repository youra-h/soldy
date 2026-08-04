/**
 * Контекст события, передаваемый в middleware.
 */
export type TEventContext<
	TEvents extends Record<string, (...args: any) => any> = any,
	K extends keyof TEvents = keyof TEvents,
> = {
	/** Имя вызываемого события */
	event: K
	/** Аргументы события */
	args: Parameters<TEvents[K]>
	/** Метод вызова эмиттера */
	type: 'emit' | 'emitWithResult' | 'emitResolve' | 'emitResolveAll'
	/** Временная метка вызова события */
	timestamp: number
}

/**
 * Функция-перехватчик (middleware) для сквозного прослушивания событий.
 *
 * В отличие от подписки `on()`, middleware срабатывает **до** обработчиков
 * и получает контекст события (имя, аргументы, тип вызова, timestamp).
 */
export type TEventMiddleware<TEvents extends Record<string, (...args: any) => any>> = (
	ctx: TEventContext<TEvents>,
) => void
