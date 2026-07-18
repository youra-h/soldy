/**
 * @soldy/host — runtime/types.ts
 *
 * Абстракции доступа к свойствам и событиям компонентов/плагинов.
 * TRuntime работает только через эти интерфейсы, не зная источник.
 */

import type { TEventHandler } from '@soldy/core'
import type { IContractMember } from '../contract/types'

// --- IAccessor: чтение/запись/подписка на одно свойство ---

export interface IAccessor<T = any> {
	get(): T
	set?(value: T): void
	subscribe(handler: () => void): () => void
}

// --- IAccessorProvider: создаёт IAccessor для IContractMember ---

export interface IAccessorProvider {
	/** Для данного члена контракта создать IAccessor (state/computed). */
	getAccessor(member: IContractMember): IAccessor | undefined
}

// --- IEventProvider: IAccessorProvider + подписка на события ---

export interface IEventProvider extends IAccessorProvider {
	/**
	 * Подписаться на событие.
	 * Возвращает функцию отписки или undefined если событие не обрабатывается.
	 */
	subscribe(event: string, handler: TEventHandler): (() => void) | undefined
}

export type TEmitPayload =
	| { type: 'property'; name: string; value: any; mutable: boolean }
	| { type: 'event'; name: string; args: any[] }
