/**
 * @soldy/host — runtime/types.ts
 *
 * Абстракции доступа к свойствам и событиям компонентов/плагинов.
 * Runtime работает только через эти интерфейсы, не зная источник.
 */

import type { TEventHandler } from '@soldy/core'
import type { ContractMember } from '../contract/types'

// --- Accessor: чтение/запись/подписка на одно свойство ---

export interface Accessor<T = any> {
	get(): T
	set?(value: T): void
	subscribe(handler: () => void): () => void
}

// --- AccessorProvider: создаёт Accessor для ContractMember ---

export interface AccessorProvider {
	/** Для данного члена контракта создать Accessor (state/computed). */
	getAccessor(member: ContractMember): Accessor | undefined
}

// --- EventProvider: AccessorProvider + подписка на события ---

export interface EventProvider extends AccessorProvider {
	/**
	 * Подписаться на событие.
	 * Возвращает функцию отписки или undefined если событие не обрабатывается.
	 */
	subscribe(event: string, handler: TEventHandler): (() => void) | undefined
}
