/**
 * Рендерер адаптера — делегирующий `Renderer2`: команду на хост из реестра
 * отдаёт его записи (`TForwardedHost`) вместе с собой, остальное — рендереру
 * Angular. Класс, а не `Proxy`: каждый метод виден типами `Renderer2`.
 */

import { Renderer2, type RendererStyleFlags2 } from '@angular/core'
import type { TForwardedHost, TListenerCallback, TListenerOptions } from './host'
import type { TForwardRegistry } from './registry'

export class TForwardingRenderer extends Renderer2 {
	/** Как у рендерера DOM: при `null` Angular не обходит узлы снятого представления по одному. */
	override destroyNode: ((node: unknown) => void) | null

	constructor(
		private readonly _delegate: Renderer2,
		private readonly _registry: TForwardRegistry,
	) {
		super()

		this.destroyNode =
			_delegate.destroyNode === null ? null : (node) => _delegate.destroyNode?.(node)
	}

	get data(): Renderer2['data'] {
		return this._delegate.data
	}

	destroy(): void {
		this._delegate.destroy()
	}

	createElement(name: string, namespace?: string | null): unknown {
		return this._delegate.createElement(name, namespace)
	}

	createComment(value: string): unknown {
		return this._delegate.createComment(value)
	}

	createText(value: string): unknown {
		return this._delegate.createText(value)
	}

	appendChild(parent: unknown, newChild: unknown): void {
		this._delegate.appendChild(parent, newChild)
	}

	insertBefore(parent: unknown, newChild: unknown, refChild: unknown, isMove?: boolean): void {
		this._delegate.insertBefore(parent, newChild, refChild, isMove)
	}

	removeChild(
		parent: unknown,
		oldChild: unknown,
		isHostElement?: boolean,
		requireSynchronousElementRemoval?: boolean,
	): void {
		this._delegate.removeChild(
			parent,
			oldChild,
			isHostElement,
			requireSynchronousElementRemoval,
		)
	}

	selectRootElement(selectorOrNode: unknown, preserveContent?: boolean): unknown {
		return this._delegate.selectRootElement(selectorOrNode, preserveContent)
	}

	parentNode(node: unknown): unknown {
		return this._delegate.parentNode(node)
	}

	nextSibling(node: unknown): unknown {
		return this._delegate.nextSibling(node)
	}

	setAttribute(el: unknown, name: string, value: string, namespace?: string | null): void {
		const host = this._forwardee(el, (host) => host.keepsAttribute(name))

		if (host) host.setAttribute(this, name, value, namespace)
		else this._delegate.setAttribute(el, name, value, namespace)
	}

	removeAttribute(el: unknown, name: string, namespace?: string | null): void {
		const host = this._forwardee(el, (host) => host.keepsAttribute(name))

		if (host) host.removeAttribute(this, name, namespace)
		else this._delegate.removeAttribute(el, name, namespace)
	}

	addClass(el: unknown, name: string): void {
		const host = this._forwardee(el, keepsLook)

		if (host) host.addClass(this, name)
		else this._delegate.addClass(el, name)
	}

	removeClass(el: unknown, name: string): void {
		const host = this._forwardee(el, keepsLook)

		if (host) host.removeClass(this, name)
		else this._delegate.removeClass(el, name)
	}

	setStyle(el: unknown, style: string, value: unknown, flags?: RendererStyleFlags2): void {
		const host = this._forwardee(el, keepsLook)

		if (host) host.setStyle(this, style, value, flags)
		else this._delegate.setStyle(el, style, value, flags)
	}

	removeStyle(el: unknown, style: string, flags?: RendererStyleFlags2): void {
		const host = this._forwardee(el, keepsLook)

		if (host) host.removeStyle(this, style, flags)
		else this._delegate.removeStyle(el, style, flags)
	}

	setProperty(el: unknown, name: string, value: unknown): void {
		const host = this._forwardee(el, (host) => host.keepsProperty(name))

		if (host) host.setProperty(this, name, value)
		else this._delegate.setProperty(el, name, value)
	}

	setValue(node: unknown, value: string): void {
		this._delegate.setValue(node, value)
	}

	listen(
		target: unknown,
		eventName: string,
		callback: TListenerCallback,
		options?: TListenerOptions,
	): () => void {
		const host = this._forwardee(target, (host) => host.keepsListener(eventName))

		return host
			? host.listen(this, eventName, callback, options)
			: this._delegate.listen(target, eventName, callback, options)
	}

	/** Запись, которой уходит команда: `el` — хост, и команду он у себя не держит. */
	private _forwardee(
		el: unknown,
		keeps: (host: TForwardedHost) => boolean,
	): TForwardedHost | undefined {
		const host = this._registry.hostOf(el)

		return host && !keeps(host) ? host : undefined
	}
}

function keepsLook(host: TForwardedHost): boolean {
	return host.keepsLook
}
