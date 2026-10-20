/**
 * Рендерер адаптера — делегирующий `Renderer2` поверх рендерера Angular.
 *
 * Через рендерер шаблона потребителя проходит всё, что он написал на элементе
 * помимо статики: привязки атрибутов (`[attr.x]`, `[aria-label]`), свойств
 * (`[title]`, `[tabIndex]`) и слушатели (`(focus)`), — и только через него:
 * компонент их не видит. Команду на хост, зарегистрированный в реестре
 * (`TForwardRegistry`), рендерер отдаёт его записи — та ставит значение на
 * внутренний узел компонента, — а всё остальное, и то, что остаётся на хосте
 * (класс, стиль, служебные атрибуты Angular, метки soldy, входы, выходы
 * `so*`), отдаёт рендереру Angular как есть. Классы и стили (`addClass`,
 * `setStyle`) он не трогает вовсе: вид — у корня.
 *
 * Класс, а не `Proxy`: команды рендерера — его методы, и каждый виден
 * типами `Renderer2`.
 */

import { Renderer2, type RendererStyleFlags2 } from '@angular/core'
import type { TListenerCallback, TListenerOptions } from './host'
import type { TForwardRegistry } from './registry'

export class TForwardingRenderer extends Renderer2 {
	/**
	 * Как у рендерера Angular: без `destroyNode` (у рендерера DOM он `null`)
	 * Angular не обходит узлы снятого представления по одному.
	 */
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
		const host = this._registry.hostOf(el)

		if (host && !host.keepsAttribute(name))
			host.setAttribute(this._delegate, name, value, namespace)
		else this._delegate.setAttribute(el, name, value, namespace)
	}

	removeAttribute(el: unknown, name: string, namespace?: string | null): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsAttribute(name))
			host.removeAttribute(this._delegate, name, namespace)
		else this._delegate.removeAttribute(el, name, namespace)
	}

	addClass(el: unknown, name: string): void {
		this._delegate.addClass(el, name)
	}

	removeClass(el: unknown, name: string): void {
		this._delegate.removeClass(el, name)
	}

	setStyle(el: unknown, style: string, value: unknown, flags?: RendererStyleFlags2): void {
		this._delegate.setStyle(el, style, value, flags)
	}

	removeStyle(el: unknown, style: string, flags?: RendererStyleFlags2): void {
		this._delegate.removeStyle(el, style, flags)
	}

	setProperty(el: unknown, name: string, value: unknown): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsProperty(name)) host.setProperty(this._delegate, name, value)
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
		const host = this._registry.hostOf(target)

		return host && !host.keepsListener(eventName)
			? host.listen(this._delegate, eventName, callback, options)
			: this._delegate.listen(target, eventName, callback, options)
	}
}
