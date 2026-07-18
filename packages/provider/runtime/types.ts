/**
 * @soldy/provider — runtime/types.ts
 *
 * Абстракции доступа к свойствам и событиям компонентов/плагинов.
 * TRuntime работает только через эти интерфейсы, не зная источник.
 */

import type { TEventHandler } from '@soldy/core'
import type { IContractProp } from '../contract/types'

// --- IAccessor: чтение/запись/подписка на одно свойство ---

export interface IAccessor<T = any> {
	get(): T
	set?(value: T): void
	subscribe(handler: () => void): () => void
}

// --- IAccessorProvider: создаёт IAccessor для IContractProp ---

export interface IAccessorProvider {
	/** Для данного свойства контракта создать IAccessor (state/computed). */
	getAccessor(prop: IContractProp): IAccessor | undefined
}

// --- IEventProvider: подписка на события (не зависит от IAccessorProvider) ---

export interface IEventProvider {
	/**
	 * Подписаться на событие.
	 * Возвращает функцию отписки или undefined если событие не обрабатывается.
	 */
	subscribe(event: string, handler: TEventHandler): (() => void) | undefined
}

// --- IProvider: полная комбинация (то, что принимает TRuntime) ---

export interface IProvider extends IAccessorProvider, IEventProvider {}

export type TEmitPayload =
	| { type: 'property'; name: string; value: any; mutable: boolean }
	| { type: 'event'; name: string; args: any[] }
