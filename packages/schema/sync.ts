import type {
	ISchema,
	IPropertySchema,
	TEmit,
	TEmitProperty,
	TEmitEvent,
	TSubscriber,
	ISyncBinding,
} from './types'
import type { IComponent } from '@soldy/core'

// ── Реализация ───────────────────────────────────────────────

/**
 * Внутренняя реализация {@link ISyncBinding}.
 *
 * Подписывается на core-события из схемы и нотифицирует
 * подписчиков через {@link TEmit}.
 *
 * @typeParam TProps — тип входных свойств компонента
 * @typeParam TEvents — тип событий компонента
 */
class SyncBindingImpl<
	TProps extends Record<string, any>,
	TEvents extends Record<string, any>,
> implements ISyncBinding<TProps, TEvents> {
	/** Подписчики на изменения свойств и событий. */
	private subscribers = new Set<TSubscriber<TProps, TEvents>>()

	/** Функции отписки от core-событий. */
	private disposers: (() => void)[] = []

	/** Объединённый словарь props + readonly из схемы. */
	private props: Record<string, IPropertySchema<TEvents> | undefined>

	/** Core-компонент, с которым синхронизируемся. */
	private instance!: IComponent<any, TEvents>

	/**
	 * @param schema — схема компонента
	 * @param instance — core-экземпляр компонента
	 */
	constructor(schema: ISchema<TProps, TEvents>, instance: IComponent<any, TEvents>) {
		this.instance = instance
		this.props = schema.getAllProps()

		// 1. Props → подписка на trigger-события
		for (const [name, prop] of Object.entries(this.props)) {
			if (!prop?.get) continue

			const handler = this.#propertyHandler([name])

			for (const event of prop.triggers ?? []) {
				this.#listen(event, handler)
				this.disposers.push(() => this.#unlisten(event, handler))
			}
		}

		// 2. Обычные события (не триггеры) → event handler
		const triggerEvents = new Set(schema.getTriggers().keys())

		for (const event of schema.events) {
			if (triggerEvents.has(event)) continue

			const handler = this.#eventHandler(event)
			this.#listen(event, handler)
			this.disposers.push(() => this.#unlisten(event, handler))
		}
	}

	/** @inheritdoc */
	subscribe(fn: TSubscriber<TProps, TEvents>): () => void {
		this.subscribers.add(fn)
		return () => this.subscribers.delete(fn)
	}

	/** @inheritdoc */
	dispose(): void {
		this.subscribers.clear()
		this.disposers.forEach((d) => d())
		this.disposers = []
	}

	/**
	 * Подписаться на core-событие.
	 *
	 * @param event  — имя события
	 * @param handler — обработчик
	 */
	#listen(event: string, handler: (...args: any[]) => void): void {
		this.instance.events.on(event as keyof TEvents & string, handler as TEvents[keyof TEvents])
	}

	/**
	 * Отписаться от core-события.
	 *
	 * @param event  — имя события
	 * @param handler — обработчик
	 */
	#unlisten(event: string, handler: (...args: any[]) => void): void {
		this.instance.events.off(event as keyof TEvents & string, handler as TEvents[keyof TEvents])
	}

	/**
	 * Создаёт обработчик trigger-события:
	 * при срабатывании эмитит изменения всех затронутых свойств.
	 *
	 * @param affectedProps — имена свойств, которые нужно перечитать
	 */
	#propertyHandler(affectedProps: string[]): () => void {
		return () => {
			for (const name of affectedProps) {
				const prop = this.props[name]
				if (!prop) continue

				const emit: TEmit<TProps, TEvents> = {
					type: 'property',
					name,
					value: prop.get(this.instance),
					mutable: !!prop.set,
				} as TEmitProperty<TProps>

				for (const fn of this.subscribers) fn(emit)
			}
		}
	}

	/**
	 * Создаёт обработчик обычного (не trigger) события:
	 * пробрасывает событие как есть подписчикам.
	 *
	 * @param event — имя события
	 */
	#eventHandler(event: string): (...args: any[]) => void {
		return (...args: any[]) => {
			const emit: TEmit<TProps, TEvents> = {
				type: 'event',
				name: event,
				args,
			} as TEmitEvent<TEvents>

			for (const fn of this.subscribers) fn(emit)
		}
	}
}

// ── Фабрика ──────────────────────────────────────────────────

/**
 * Создаёт {@link ISyncBinding} для синхронизации core-компонента с адаптером фреймворка.
 *
 * @param schema   — схема компонента
 * @param instance — core-экземпляр компонента
 * @returns привязку, через которую адаптер получает изменения
 */
export function sync<TProps extends Record<string, any>, TEvents extends Record<string, any>>(
	schema: ISchema<TProps, TEvents>,
	instance: IComponent<any, TEvents>,
): ISyncBinding<TProps, TEvents> {
	return new SyncBindingImpl(schema, instance)
}
