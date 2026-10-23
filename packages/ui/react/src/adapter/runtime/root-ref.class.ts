/**
 * TRootRef — ref корня компонента: узел привязывается к `TElementPlugin`
 * контекста, и тот же узел получает `ref` потребителя; корень значением —
 * подпиской (`TRootSource`). AGENTS.md (React), «Корень и `ref` потребителя».
 */

import type { Ref } from 'react'
import type { IAdapterContext } from '@soldy-ui/setup'

/** `ref` потребителя. Узел — `Element`: `tag` свободен, корнем бывает `<svg>`. */
export type TConsumerRef = Ref<Element> | undefined

/** Корень значением — подписка и снимок, как их ждёт `useSyncExternalStore`. */
export type TRootSource = {
	readonly subscribe: (listener: () => void) => () => void
	/** Корень сейчас: до коммита, после снятия и у уничтоженного — `null`. */
	readonly getSnapshot: () => Element | null
}

const unsubscribed = (): void => {}

function isConsumerRef(value: unknown): value is NonNullable<TConsumerRef> {
	return (
		typeof value === 'function' ||
		(typeof value === 'object' && value !== null && 'current' in value)
	)
}

/** `ref` потребителя из пропсов: в React 19 это обычный проп. */
export function consumerRefOf(props: object): TConsumerRef {
	const ref: unknown = Reflect.get(props, 'ref')

	return isConsumerRef(ref) ? ref : undefined
}

/** Узел, отданный `ref` потребителя, и как его отпустить. */
type TGiven = {
	readonly ref: NonNullable<TConsumerRef>
	readonly node: Element
	readonly release: () => void
}

/** Отдать узел `ref` так, как отдал бы React, и вернуть, как его отпустить. */
function give(ref: NonNullable<TConsumerRef>, node: Element): () => void {
	if (typeof ref === 'function') {
		const cleanup = ref(node)

		return typeof cleanup === 'function' ? cleanup : () => ref(null)
	}

	ref.current = node

	return () => {
		ref.current = null
	}
}

export class TRootRef implements TRootSource {
	/** Контекст корня; уничтожен — `null`, и ref больше ничего не делает. */
	private _context: IAdapterContext | null
	private _node: Element | null = null
	/** `ref` потребителя последнего коммита. */
	private _consumer: TConsumerRef = undefined
	private _given: TGiven | null = null
	/** Заводятся с первым подписчиком — у большинства компонентов их нет. */
	private _listeners: Set<() => void> | null = null

	constructor(adapter: IAdapterContext) {
		this._context = adapter

		adapter.events.listen((event) => {
			if (event === 'destroy') this._destroy()
		})
	}

	/** Ref корня: привязка к `TElementPlugin`, затем тот же узел — `ref` потребителя. */
	readonly attach = (element: Element | null): void => {
		if (!this._context) return

		const changed = element !== this._node

		this._context.bindElement(element)
		this._node = element
		this.sync()

		// После привязки: корень, который прочтут подписчики, уже у плагинов
		if (changed) this._listeners?.forEach((listener) => listener())
	}

	readonly subscribe = (listener: () => void): (() => void) => {
		if (!this._context) return unsubscribed

		this._listeners ??= new Set()
		this._listeners.add(listener)

		return () => {
			this._listeners?.delete(listener)
		}
	}

	readonly getSnapshot = (): Element | null => this._node

	/** Ref корня внутри обёртки: только привязка — `ref` потребителя получает обёртка. */
	readonly bind = (element: Element | null): void => {
		this._context?.bindElement(element)
	}

	/** `ref` потребителя коммита — раньше, чем React привяжет ref узлов. */
	consume(ref: TConsumerRef): void {
		if (this._context) this._consumer = ref
	}

	/** Сменился узел или `ref` потребителя: прежнему — отпустить, новому — отдать. */
	sync(): void {
		const node = this._node
		const ref = this._consumer
		const given = this._given

		if (given && given.ref === ref && given.node === node) return

		this._given = null
		given?.release()

		if (node && ref) this._given = { ref, node, release: give(ref, node) }
	}

	private _destroy(): void {
		this._context = null
		this._node = null
		this._consumer = undefined
		this._listeners = null
		this.sync()
	}
}
