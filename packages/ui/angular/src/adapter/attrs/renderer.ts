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
 * `setStyle`) — вид хоста, и у хоста с коробкой рендерер их не трогает; у
 * хоста без коробки (обёртка региона тостов) внешний узел компонента — узел
 * внутри, и их рендерер тоже отдаёт записи хоста (`keepsLook`).
 *
 * Запись получает с командой сам рендерер адаптера, а не рендерер Angular под
 * ним, и на свой узел пишет через него же. Поэтому узел записи, который сам
 * хост из реестра, — поле `<div so-input>` в шаблоне Select, — получает
 * команду тем же путём: его запись по своим правилам отдаёт её дальше, на свой
 * `<input>`. Так написанное на хосте проходит цепочку хостов до узла, где
 * работает, — как `v-bind` на `<Input>` у Vue, — а на каждом звене остаётся
 * то, что звено держит у себя (`keeps*`). Снятие и переезд на новый узел идут
 * той же цепочкой.
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

		if (host && !host.keepsAttribute(name)) host.setAttribute(this, name, value, namespace)
		else this._delegate.setAttribute(el, name, value, namespace)
	}

	removeAttribute(el: unknown, name: string, namespace?: string | null): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsAttribute(name)) host.removeAttribute(this, name, namespace)
		else this._delegate.removeAttribute(el, name, namespace)
	}

	addClass(el: unknown, name: string): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsLook) host.addClass(this, name)
		else this._delegate.addClass(el, name)
	}

	removeClass(el: unknown, name: string): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsLook) host.removeClass(this, name)
		else this._delegate.removeClass(el, name)
	}

	setStyle(el: unknown, style: string, value: unknown, flags?: RendererStyleFlags2): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsLook) host.setStyle(this, style, value, flags)
		else this._delegate.setStyle(el, style, value, flags)
	}

	removeStyle(el: unknown, style: string, flags?: RendererStyleFlags2): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsLook) host.removeStyle(this, style, flags)
		else this._delegate.removeStyle(el, style, flags)
	}

	setProperty(el: unknown, name: string, value: unknown): void {
		const host = this._registry.hostOf(el)

		if (host && !host.keepsProperty(name)) host.setProperty(this, name, value)
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
			? host.listen(this, eventName, callback, options)
			: this._delegate.listen(target, eventName, callback, options)
	}
}
