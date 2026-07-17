/**
 * @soldy/host — runtime/Accessor.ts
 *
 * Абстракция доступа к свойству компонента/плагина.
 * Позволяет читать, писать и подписываться на изменения.
 * Runtime работает только через Accessor, не зная источник.
 */

export interface Accessor<T = any> {
	get(): T
	set?(value: T): void
	subscribe(handler: () => void): () => void
}
