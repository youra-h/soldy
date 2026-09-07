/**
 * TSoldyElement — базовый класс кастомного элемента soldy.
 *
 * Аналог TComponentBase из Angular: держит весь общий жизненный цикл, чтобы
 * компонент состоял только из дескриптора, setup-слоя и ссылки на шаблон.
 *
 * - connectedCallback: снимает light-DOM содержимое, создаёт binding, рисует
 * - attributeChangedCallback: приводит атрибут к типу и пишет в Core
 * - disconnectedCallback: снимает подписки и уничтожает adapter-context
 *
 * Обновления точечные. `useSyncProps` сообщает, какой именно проп изменился;
 * имена копятся в `_dirty`, а на флаше применяются только те привязки, которые
 * за эти пропы отвечают. Сам флаш откладывается в микротаску, потому что одно
 * изменение в ядре часто даёт несколько триггеров.
 *
 * Структурные props база применяет сама — они одинаковы у всех визуальных
 * компонентов soldy:
 *   rendered → корень существует или удалён
 *   tag      → пересоздание корня (имя тега элемента поменять нельзя)
 *   classes  → className
 *   visible  → display
 *
 * Слоты распределяются по атрибуту `slot` — это нативная HTML-семантика, а
 * не выдумка soldy. Shadow DOM для этого не используется: тема раскладывается
 * глобальными BEM-классами и через теневую границу не проходит, поэтому свет
 * переносится вручную в точки, объявленные шаблоном.
 */

import { DEFAULT_SLOT, type IComponentDescriptor } from '@soldy/setup'
import { buildAttributeMap, coerceAttribute, type IAttributeBinding } from '../common'
import type { ITemplate, ITemplateContext, TSlotTargets } from '../template'
import type { TBinding } from './useAdapter'
import type { TWebcState } from './useSyncProps'

/** Кэш карт атрибутов по дескриптору — строить её на каждый элемент незачем. */
const ATTRIBUTE_MAPS = new WeakMap<IComponentDescriptor, Map<string, IAttributeBinding>>()

/**
 * Раскладывает свет по слотам и вынимает его из хоста.
 *
 * Признак — атрибут `slot` на элементе, как в стандарте. Текстовые узлы
 * атрибутов не имеют и всегда попадают в слот по умолчанию, поэтому
 * `<soldy-button>Текст</soldy-button>` работает как раньше.
 */
function groupBySlot(nodes: readonly ChildNode[]): Map<string, ChildNode[]> {
	const groups = new Map<string, ChildNode[]>()

	for (const node of nodes) {
		const name =
			node instanceof Element ? (node.getAttribute('slot') ?? DEFAULT_SLOT) : DEFAULT_SLOT

		const group = groups.get(name)

		if (group) {
			group.push(node)
		} else {
			groups.set(name, [node])
		}

		node.remove()
	}

	return groups
}

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

	/** Дескриптор компонента — нужен для карты атрибутов. */
	protected abstract get descriptor(): IComponentDescriptor

	/** Шаблон компонента: структура корня и привязки. */
	protected abstract get template(): ITemplate

	/** Создаёт binding через setup-слой компонента. */
	protected abstract setup(
		props: Record<string, unknown>,
		onUpdate: (name: string, value: unknown) => void,
	): TBinding<TInstance>

	/** Значения, выставленные до подключения к DOM. */
	private readonly _pending: Record<string, unknown> = {}
	/** Свет, сгруппированный по имени слота. */
	private _light = new Map<string, ChildNode[]>()
	private _root: HTMLElement | null = null
	private _content: HTMLElement | null = null
	private readonly _dirty = new Set<string>()
	private _flushQueued = false
	private _connected = false

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

	connectedCallback(): void {
		if (this._connected) return

		this._connected = true

		// Снимаем свет ДО первой отрисовки: дальше он живёт внутри корня
		this._light = groupBySlot(Array.from(this.childNodes))

		this.binding = this.setup(this._pending, (name, value) => this._onUpdate(name, value))
		this.binding.syncProps(this._pending)

		this._flush(true)
	}

	disconnectedCallback(): void {
		this._connected = false
		this.binding?.destroy()
		this.binding = undefined
	}

	attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
		const attribute = attributeMap(this.descriptor).get(name)

		if (!attribute) return

		const next = coerceAttribute(value, attribute)

		if (next === undefined) return

		this._write(attribute.prop, next)
	}

	/** Установка значения из JS: `el.text = 'x'`. */
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
		this._dirty.add(name)
		this._queueFlush()
	}

	private _queueFlush(): void {
		if (this._flushQueued || !this._connected) return

		this._flushQueued = true

		queueMicrotask(() => {
			this._flushQueued = false

			if (this._connected) this._flush()
		})
	}

	private _flush(full = false): void {
		const state = this.state

		if (!state.rendered) {
			this._detachRoot()
			this._dirty.clear()

			return
		}

		// Пересоздание корня равносильно полной отрисовке: новый DOM пуст
		const recreated = this._ensureRoot(this.template.tag(state))
		const root = this._root!
		const applyAll = full || recreated

		if (applyAll || this._dirty.has('classes')) {
			root.className = ((state.classes as string[]) ?? []).join(' ')
		}

		if (applyAll || this._dirty.has('visible')) {
			root.style.display = state.visible === false ? 'none' : ''
		}

		const context: ITemplateContext = {
			root,
			content: this._content!,
			state,
			hasSlot: (name) => (this._light.get(name)?.length ?? 0) > 0,
		}

		for (const binding of this.template.bindings) {
			if (applyAll || binding.props.some((prop) => this._dirty.has(prop))) {
				binding.apply(context)
			}
		}

		this._dirty.clear()
	}

	/** Создаёт корень нужного тега. Возвращает true, если он был пересоздан. */
	private _ensureRoot(tag: string): boolean {
		if (this._root && this._root.tagName.toLowerCase() === tag) return false

		const root = document.createElement(tag)
		const targets = this.template.create(root)

		this._root?.remove()
		this._root = root

		// Слот по умолчанию объявлен у любого визуального слоя, но шаблон вправе
		// не иметь других: тогда содержимое просто ляжет в корень.
		const fallback = targets[DEFAULT_SLOT]

		this._content = fallback?.mode === 'append' ? fallback.node : root

		this.appendChild(root)
		this._distribute(targets)
		this.binding?.bindElement(root)

		return true
	}

	/** Раскладывает свет по точкам, объявленным шаблоном. */
	private _distribute(targets: TSlotTargets): void {
		for (const [name, nodes] of this._light) {
			const target = targets[name]

			for (const node of nodes) {
				if (!target) {
					// Слот не объявлен шаблоном — содержимое не теряем, кладём в корень
					this._root!.appendChild(node)
				} else if (target.mode === 'append') {
					target.node.appendChild(node)
				} else {
					target.node.parentNode?.insertBefore(node, target.node)
				}
			}
		}
	}

	private _detachRoot(): void {
		if (!this._root) return

		// Содержимое забираем себе, иначе оно уйдёт из DOM вместе с корнем
		for (const nodes of this._light.values()) {
			nodes.forEach((node) => node.remove())
		}

		this._root.remove()
		this._root = null
		this._content = null
		this.binding?.bindElement(null)
	}
}
