/**
 * Запись реестра (`TForwardRegistry`) — хост, который отдаёт написанное на нём
 * своему внутреннему узлу: `<input>` поля, строке элемента, узлу списка,
 * `table`. Аналог `$attrs` у Vue: команды рендерера на хост (`[attr.x]`,
 * `[title]`, `(focus)`) запись ставит на узел, а пока узла нет — держит;
 * сменился узел — переносит. AGENTS.md (Angular), «Рендерер адаптера —
 * `provideAttrs()`».
 *
 * Пишет запись тем рендерером, что пришёл с командой: узел, который сам хост
 * (поле `<div so-input>` в шаблоне Select), получает команду своей записью —
 * так написанное проходит цепочку хостов.
 */

import type { Renderer2, RendererStyleFlags2 } from '@angular/core'
import {
	NO_ATTRIBUTES,
	TElementAttributes,
	attributesOf,
	sumLayers,
} from '../runtime/root-attributes'

export type TListenerCallback = Parameters<Renderer2['listen']>[2]
export type TListenerOptions = Parameters<Renderer2['listen']>[3]
type TStyleFlags = RendererStyleFlags2 | undefined

export type TForwardOptions = {
	/**
	 * У хоста нет своей коробки (`display: contents` — обёртка региона тостов):
	 * класс и стиль потребителя тоже уходят узлу.
	 */
	readonly boxless?: boolean
}

/** Вид хоста: у хоста с коробкой остаётся на нём. */
const LOOK_ATTRIBUTES: ReadonlySet<string> = new Set(['class', 'style'])
const LOOK_PROPERTIES: ReadonlySet<string> = new Set(['className'])

/**
 * Служебные атрибуты Angular. `ngh`, увезённый на поле, ломал гидратацию:
 * Angular не узнавал компонент и рисовал второе поле.
 */
const SERVICE_ATTRIBUTES: ReadonlySet<string> = new Set([
	'ngh',
	'ng-version',
	'ng-server-context',
	'ngskiphydration',
	'jsaction',
])

/** `ng-reflect-*`, инкапсуляция стилей и метки soldy (селектор, директивы адаптера). */
const HOST_PREFIXES: readonly string[] = ['ng-reflect-', '_ng', 'so-']

/** Старые анимации: `[@x]` и `(@x.done)` анимирует рендерер анимаций на самом хосте. */
const SYNTHETIC_PREFIX = '@'

/**
 * Выходы `so*` (Angular слушает их и как событие DOM) и движение: его слушает
 * на хосте сам Angular (`animate.leave`), а движение частей всплывает само.
 */
const HOST_EVENT = /^(so[A-Z]|animation|transition)/

function marksHost(name: string): boolean {
	const lower = name.toLowerCase()

	return SERVICE_ATTRIBUTES.has(lower) || HOST_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

function staysOnHost(name: string): boolean {
	return LOOK_ATTRIBUTES.has(name.toLowerCase()) || marksHost(name)
}

/** Последняя команда: как положить её на узел и как снять со старого. */
type TWrite = {
	readonly apply: (node: Element) => void
	readonly undo?: (node: Element) => void
}

class TForwardedListener {
	private _off: (() => void) | null = null

	constructor(
		private readonly _renderer: Renderer2,
		private readonly _event: string,
		private readonly _callback: TListenerCallback,
		private readonly _options: TListenerOptions,
	) {}

	on(node: Element): void {
		this._off = this._renderer.listen(node, this._event, this._callback, this._options)
	}

	off(): void {
		this._off?.()
		this._off = null
	}
}

export type THostLookup = (node: Element) => TForwardedHost | undefined

export class TForwardedHost {
	private _node: Element | null = null
	private _released = false

	private readonly _attributes = new Map<string, TWrite>()
	private readonly _properties = new Map<string, TWrite>()
	private readonly _classes = new Map<string, TWrite>()
	private readonly _styles = new Map<string, TWrite>()
	/** Порядок воспроизведения на новом узле. */
	private readonly _writes = [this._attributes, this._properties, this._classes, this._styles]
	private readonly _listeners = new Set<TForwardedListener>()

	/** Набор разметки владельца на хосте (`[so-attributes]`). */
	private _markup: object = NO_ATTRIBUTES
	/** Набор от записи внешнего звена цепочки: её узел — этот хост. */
	private _received: object = NO_ATTRIBUTES
	/** Сумма наборов для узла; `null` — наборов не было. */
	private _set: object | null = null

	/**
	 * @param _own имена входов и `ctrl`, строчными: атрибут с таким именем — запись
	 *   входа, он остаётся на хосте
	 */
	constructor(
		private readonly _own: ReadonlySet<string>,
		private readonly _boxless: boolean,
		private readonly _hostOf: THostLookup,
		private readonly _onRelease: () => void,
	) {}

	get keepsLook(): boolean {
		return !this._boxless
	}

	keepsAttribute(name: string): boolean {
		const stays = this._boxless ? marksHost(name) : staysOnHost(name)

		return stays || this._own.has(name.toLowerCase())
	}

	keepsProperty(name: string): boolean {
		return (
			name.startsWith(SYNTHETIC_PREFIX) ||
			(this.keepsLook && LOOK_PROPERTIES.has(name)) ||
			this._own.has(name.toLowerCase())
		)
	}

	keepsListener(event: string): boolean {
		return event.startsWith(SYNTHETIC_PREFIX) || HOST_EVENT.test(event)
	}

	setAttribute(
		renderer: Renderer2,
		name: string,
		value: string,
		namespace: string | null | undefined,
	): void {
		this._write(
			this._attributes,
			`${namespace ?? ''}|${name}`,
			(node) => renderer.setAttribute(node, name, value, namespace),
			(node) => renderer.removeAttribute(node, name, namespace),
		)
	}

	removeAttribute(renderer: Renderer2, name: string, namespace: string | null | undefined): void {
		this._write(this._attributes, `${namespace ?? ''}|${name}`, (node) =>
			renderer.removeAttribute(node, name, namespace),
		)
	}

	/** Свойство со старого узла не снять — значение там и остаётся. */
	setProperty(renderer: Renderer2, name: string, value: unknown): void {
		this._write(this._properties, name, (node) => renderer.setProperty(node, name, value))
	}

	addClass(renderer: Renderer2, name: string): void {
		this._write(
			this._classes,
			name,
			(node) => renderer.addClass(node, name),
			(node) => renderer.removeClass(node, name),
		)
	}

	removeClass(renderer: Renderer2, name: string): void {
		this._write(this._classes, name, (node) => renderer.removeClass(node, name))
	}

	setStyle(renderer: Renderer2, style: string, value: unknown, flags: TStyleFlags): void {
		this._write(
			this._styles,
			style,
			(node) => renderer.setStyle(node, style, value, flags),
			(node) => renderer.removeStyle(node, style, flags),
		)
	}

	removeStyle(renderer: Renderer2, style: string, flags: TStyleFlags): void {
		this._write(this._styles, style, (node) => renderer.removeStyle(node, style, flags))
	}

	/** Отписка работает в любом порядке со снятием компонента. */
	listen(
		renderer: Renderer2,
		event: string,
		callback: TListenerCallback,
		options: TListenerOptions,
	): () => void {
		const listener = new TForwardedListener(renderer, event, callback, options)

		this._listeners.add(listener)

		if (this._node) listener.on(this._node)

		return () => {
			listener.off()
			this._listeners.delete(listener)
		}
	}

	/** Набор разметки владельца на хосте — узлу, слоем `forwarded`. */
	setMarkup(set: object): void {
		this._markup = attributesOf(set)
		this._sum()
	}

	/** Набор от внешнего звена — поверх своего: на общем имени главнее внешний. */
	receive(set: object): void {
		this._received = attributesOf(set)
		this._sum()
	}

	attach(node: Element | null): void {
		if (this._released || node === this._node) return

		if (this._node) this._detach(this._node)

		this._node = node

		if (node) this._apply(node)
	}

	release(): void {
		if (this._released) return

		for (const listener of this._listeners) listener.off()

		this._listeners.clear()
		this._node = null
		this._released = true
		this._onRelease()
	}

	private _write(
		writes: Map<string, TWrite>,
		key: string,
		apply: TWrite['apply'],
		undo?: TWrite['undo'],
	): void {
		writes.set(key, { apply, undo })

		if (this._node) apply(this._node)
	}

	private _sum(): void {
		this._set = sumLayers([this._markup, this._received])

		if (this._node) this._send(this._node, this._set)
	}

	/** Набор — раскладчику узла, а у узла-хоста — его записи, следующему звену. */
	private _send(node: Element, set: object): void {
		const next = this._hostOf(node)

		if (next) next.receive(set)
		else TElementAttributes.of(node).set('forwarded', set)
	}

	private _apply(node: Element): void {
		// Набор — раньше привязок: на общем имени главнее написанное потребителем
		if (this._set) this._send(node, this._set)

		for (const writes of this._writes) {
			for (const write of writes.values()) write.apply(node)
		}

		for (const listener of this._listeners) listener.on(node)
	}

	private _detach(node: Element): void {
		if (this._set) this._send(node, NO_ATTRIBUTES)

		for (const writes of this._writes) {
			for (const write of writes.values()) write.undo?.(node)
		}

		for (const listener of this._listeners) listener.off()
	}
}
