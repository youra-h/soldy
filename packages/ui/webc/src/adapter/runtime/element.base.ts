/**
 * TSoldyElement — базовый класс кастомного элемента soldy.
 *
 * Аналог TComponentBase из Angular: выносит общий жизненный цикл, чтобы
 * компонент занимался только разметкой.
 *
 * - connectedCallback: снимает light-DOM содержимое, создаёт binding, рендерит
 * - attributeChangedCallback: приводит атрибут к типу и пишет в Core
 * - disconnectedCallback: снимает подписки и уничтожает adapter-context
 * - перерисовка коалесцируется в микротаске: одно изменение props в ядре
 *   часто вызывает несколько триггеров, и без этого рендер шёл бы на каждый
 *
 * Подкласс обязан реализовать `setup()` и `render()`, а также объявить
 * `static observedAttributes` (см. useAttributes) и `descriptor`.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { buildAttributeMap, coerceAttribute, type IAttributeBinding } from '../common'
import type { TBinding } from './useAdapter'
import type { TWebcState } from './useSyncProps'

/** Кэш карт атрибутов по дескриптору — строить её на каждый элемент незачем. */
const ATTRIBUTE_MAPS = new WeakMap<IComponentDescriptor, Map<string, IAttributeBinding>>()

function attributeMap(descriptor: IComponentDescriptor): Map<string, IAttributeBinding> {
	let map = ATTRIBUTE_MAPS.get(descriptor)

	if (!map) {
		map = buildAttributeMap(descriptor)
		ATTRIBUTE_MAPS.set(descriptor, map)
	}

	return map
}

export abstract class TSoldyElement<TInstance = any> extends HTMLElement {
	protected binding?: TBinding<TInstance>

	/** Значения, выставленные до подключения к DOM. */
	private readonly _pending: Record<string, unknown> = {}
	private _light: ChildNode[] = []
	private _renderQueued = false
	private _connected = false

	/** Дескриптор компонента — нужен для карты атрибутов. */
	protected abstract get descriptor(): IComponentDescriptor

	/** Создаёт binding через setup-слой компонента. */
	protected abstract setup(
		props: Record<string, unknown>,
		onUpdate: (name: string, value: unknown) => void,
	): TBinding<TInstance>

	/** Полная перерисовка содержимого элемента. */
	protected abstract render(): void

	get state(): TWebcState {
		return this.binding?.state ?? {}
	}

	/**
	 * Готовый core-инстанс. Присваивать имеет смысл только до подключения:
	 * adapter-context создаётся один раз, как и в остальных адаптерах.
	 */
	get ctrl(): TInstance | undefined {
		return (this.binding?.ctrl ?? this._pending.ctrl) as TInstance | undefined
	}

	set ctrl(value: TInstance | undefined) {
		this._pending.ctrl = value
	}

	/** Содержимое, написанное пользователем внутри тега; подкласс переносит его в корень. */
	protected get light(): ChildNode[] {
		return this._light
	}

	connectedCallback(): void {
		if (this._connected) return

		this._connected = true

		// Снимаем свет ДО первого рендера — дальше им распоряжается подкласс.
		this._light = Array.from(this.childNodes)
		this._light.forEach((node) => node.remove())

		this.binding = this.setup(this._pending, (name, value) => this._onUpdate(name, value))
		this.binding.syncProps(this._pending)

		this.render()
	}

	disconnectedCallback(): void {
		this._connected = false
		this.binding?.destroy()
		this.binding = undefined
	}

	attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
		const binding = attributeMap(this.descriptor).get(name)

		if (!binding) return

		const next = coerceAttribute(value, binding)

		if (next === undefined) return

		this._write(binding.prop, next)
	}

	/**
	 * Установка значения из JS: `el.text = 'x'`.
	 * До подключения складывается в буфер, после — уходит прямо в Core.
	 */
	protected setProp(name: string, value: unknown): void {
		this._write(name, value)
	}

	protected getProp(name: string): unknown {
		// Props без триггеров (ctrl) в state не попадают — берём из буфера
		if (this.binding && name in this.binding.state) return this.binding.state[name]

		return this._pending[name]
	}

	private _write(name: string, value: unknown): void {
		this._pending[name] = value
		this.binding?.syncProps({ [name]: value })
	}

	private _onUpdate(name: string, value: unknown): void {
		this._pending[name] = value
		this._queueRender()
	}

	private _queueRender(): void {
		if (this._renderQueued || !this._connected) return

		this._renderQueued = true

		queueMicrotask(() => {
			this._renderQueued = false

			if (this._connected) this.render()
		})
	}
}
