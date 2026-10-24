/**
 * База элемента: встроенный элемент тега, расширенный классом компонента
 * (customized built-in). `<button is="so-button">` — настоящая кнопка, и
 * форма, `<label>`, фокус и доступность у неё нативные. Фабрика
 * `ElementBase(HTMLButtonElement, spec)` собирает класс над нативным классом
 * тега: база одна, нативный класс у каждого тега свой.
 *
 * Структура шаблона и свет — один раз, при первом подключении. Каждое
 * подключение — новая связка над тем же инстансом и полная отрисовка;
 * отключение снимает связку. Первое подключение, которому собираться рано,
 * уходит в очередь отсрочки, а подключение внутри чужого — в ожидание.
 * Обновления точечные: имена сменившихся пропов копятся до микрозадачи, и
 * флаш применяет только их привязки. AGENTS.md (Web Components), «База
 * элемента».
 */

import type { IComponent, IComponentProps } from '@soldy-ui/core'
import {
	TSurface,
	type DescriptorComponentProps,
	type IComponentDescriptor,
	type TStateSnapshot,
} from '@soldy-ui/setup'
import {
	buildAttributeMap,
	coerceAttribute,
	isHostProp,
	toAttributeName,
	type IAttributeBinding,
	type THostProp,
	WebcProfile,
} from '../common'
import type { ITemplate, ITemplateContext, TTemplateParts } from '../template'
import { TDeferral } from './deferral'
import { isUnderUpgrade, isUpgradedOnRegistration } from './defineElement'
import { TLight } from './light'
import { markPlaceOwner } from './marks'
import { TElementAttributes, TPaint, classesOf, orderOf, setOf, stylesOf } from './paint'
import { TPropStore } from './props'
import { keepsBinding } from './relocation'
import { placeOf, planOf, presenceOf, type TRootSpec } from './root'
import { TSubtree, followAbove, provideSubtree, type TAbove } from './subtree'
import { TTeleport } from './teleport'
import type { TBinding, TBindingState, TUpdateListener } from './useAdapter'
import { connecting, isConnecting, wait } from './waiting'

/** `id` поля — проп поля, а не вход корня: два узла с одним `id` сломали бы `<label for>`. */
const CONTROL_ID = 'id'

/** Свой проп главнее одноимённого пропа фасада: дельту получают обе связки. */
function attributesOf(
	descriptors: readonly IComponentDescriptor[],
): Map<string, IAttributeBinding> {
	const map = new Map<string, IAttributeBinding>()

	for (const descriptor of descriptors) {
		for (const [name, binding] of buildAttributeMap(descriptor)) {
			if (!map.has(name)) map.set(name, binding)
		}
	}

	return map
}

/** Описание корня с шаблоном разошлось — нести некуда. */
function built(node: HTMLElement | undefined, what: string): HTMLElement {
	if (!node) throw new Error(`[soldy] Описание корня объявляет ${what}, а шаблон его не построил`)

	return node
}

export interface IElementBase<TInstance, TFacade = unknown, TOwnerFacade = unknown> {
	readonly state: TBindingState<TInstance, TFacade, unknown, TOwnerFacade>
	/** Инстанс первой сборки достаётся следующим: перестановка не подменяет `el.ctrl`. */
	ctrl: TInstance | undefined
	connectedCallback(): void
	disconnectedCallback(): void
	attributeChangedCallback(name: string, old: string | null, value: string | null): void
}

/**
 * Свойства пропов на прототипе — контракт дескриптора, как пропсы React и
 * Solid, без того, что у элемента уже есть по тегу, `HOST_PROPS` и `ctrl`.
 */
export type TElementProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TNative extends HTMLElement,
> = Omit<DescriptorComponentProps<TDescriptorFn>, keyof TNative | THostProp | 'ctrl'>

export type TDescriptorFactory = () => IComponentDescriptor

/** Свои атрибуты элемента свойствами: значение — атрибут, без него `null`; `undefined` и `null` его снимают. */
export type TOwnAttributes<TOwn extends string> = { [K in TOwn]: string | null | undefined }

/** Тип элемента: нативный элемент тега, своё базы, свойства пропов и своих атрибутов. */
export type TElementOf<
	TNative extends HTMLElement,
	TDescriptor extends TDescriptorFactory,
	TInstance,
	TFacade = unknown,
	TOwnerFacade = unknown,
	TOwn extends string = never,
> = TNative &
	IElementBase<TInstance, TFacade, TOwnerFacade> &
	TElementProps<TDescriptor, TNative> &
	TOwnAttributes<TOwn>

/** `TOutputs` — выходы плагинов дескриптора: шаблон читает их в состоянии с типом. */
export interface IElementSpec<
	TInstance,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
	TDescriptor extends TDescriptorFactory = TDescriptorFactory,
	TOwn extends string = never,
> {
	readonly descriptor: TDescriptor
	/** Дескриптор фасада коллекции: его пропсы — тоже входы элемента. */
	readonly facade?: TDescriptorFactory
	/** Дескриптор фасада своей коллекции у пункта с подменю. */
	readonly ownerFacade?: TDescriptorFactory
	readonly template: ITemplate<TInstance, TFacade, TOutputs, TOwnerFacade>
	readonly root?: TRootSpec
	/** Свои атрибуты сверх пропов (`icon`): значение хранит атрибут, свойство его отражает. */
	readonly attributes?: readonly TOwn[]
	setup(
		host: HTMLElement,
		ctrl: TInstance | undefined,
		props: Record<string, unknown>,
		onUpdate: TUpdateListener,
	): TBinding<TInstance, TFacade, TOutputs, TOwnerFacade>
}

/** Rest `any[]` — форма конструктора миксина: без неё класс базы с нативным не сложить. */
export type TNativeElementClass = new (...args: any[]) => HTMLElement

/**
 * `is` — проверка элемента с его полным типом: свойства пропов база вешает на
 * прототип в рантайме, и тип экземпляра класса о них не знает.
 */
export type TElementClass<
	TInstance,
	TFacade = unknown,
	TOwnerFacade = unknown,
	TElement = IElementBase<TInstance, TFacade, TOwnerFacade>,
> = (new (...args: any[]) => IElementBase<TInstance, TFacade, TOwnerFacade>) & {
	readonly observedAttributes: string[]
	is(node: unknown): node is TElement
}

/**
 * Класс элемента по нативному классу тега и дескриптору. Аннотация экспорта
 * элемента: дескриптор по имени (`typeof ButtonDescriptor`) декларация
 * пишет коротко, а выведенный тип развернула бы целиком.
 */
export type TElementClassOf<
	TNative extends TNativeElementClass,
	TDescriptor extends TDescriptorFactory,
	TInstance,
	TFacade = unknown,
	TOwnerFacade = unknown,
	TOwn extends string = never,
> = TNative &
	TElementClass<
		TInstance,
		TFacade,
		TOwnerFacade,
		TElementOf<InstanceType<TNative>, TDescriptor, TInstance, TFacade, TOwnerFacade, TOwn>
	>

/** Тип элемента класса: `TElementType<typeof TButtonElement>`. */
export type TElementType<TClass> = TClass extends { is(node: unknown): node is infer T } ? T : never

/**
 * Тип результата объявлен явно: класс, выведенный из выражения, TypeScript в
 * декларации не выпустит — у него приватные члены.
 */
export function ElementBase<
	TNative extends TNativeElementClass,
	TInstance extends IComponent<IComponentProps, any>,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
	TDescriptor extends TDescriptorFactory = TDescriptorFactory,
	TOwn extends string = never,
>(
	Native: TNative,
	spec: IElementSpec<TInstance, TFacade, TOutputs, TOwnerFacade, TDescriptor, TOwn>,
): TElementClassOf<TNative, TDescriptor, TInstance, TFacade, TOwnerFacade, TOwn> {
	const descriptors = [spec.descriptor(), spec.facade?.(), spec.ownerFacade?.()].filter(
		(descriptor): descriptor is IComponentDescriptor => descriptor !== undefined,
	)
	const plan = planOf(spec.root)
	const attributes = attributesOf(descriptors)

	if (plan.fieldId && !attributes.has(CONTROL_ID)) {
		throw new Error('[soldy] Описание корня объявляет id поля, а у дескриптора пропа id нет')
	}

	// `id` поля — не вход корня, и в карте пропов его нет: атрибут база берёт
	// пропом и снимает с корня — при построении и на каждую запись из кода.
	// Входом снятие вернуло бы проп к умолчанию
	const fieldId = (plan.control || plan.fieldId) && attributes.has(CONTROL_ID)

	if (fieldId) attributes.delete(CONTROL_ID)

	/** Входы пропов на корне: их значение в наборе ядра верно всегда. У обёртки их нет. */
	const inputs: ReadonlySet<string> = new Set(plan.wrapped ? [] : attributes.keys())
	/** Свои атрибуты: имя атрибута → имя свойства. */
	const own: ReadonlyMap<string, string> = new Map(
		(spec.attributes ?? []).map((name) => [toAttributeName(name), name]),
	)

	class TElementBase extends Native implements IElementBase<TInstance, TFacade, TOwnerFacade> {
		static get observedAttributes(): string[] {
			return [...attributes.keys(), ...own.keys(), ...(fieldId ? [CONTROL_ID] : [])]
		}

		static is(
			node: unknown,
		): node is TElementOf<
			InstanceType<TNative>,
			TDescriptor,
			TInstance,
			TFacade,
			TOwnerFacade,
			TOwn
		> {
			return node instanceof TElementBase
		}

		private _binding?: TBinding<TInstance, TFacade, TOutputs, TOwnerFacade>
		private _ctrl?: TInstance
		private readonly _props = new TPropStore()
		private readonly _light = new TLight(this)
		private readonly _dirty = new Set<string>()
		private _flushQueued = false
		private _connected = false
		/** В очереди отсрочки или в ожидании чужого подключения. */
		private _deferred = false

		/** Узел, на который база кладёт то, что пишет ядро, и который получает `TElementPlugin`. */
		private _root: HTMLElement = this
		/** Внешний узел — на него ложится скрытие. */
		private _outer: HTMLElement = this
		private _companion: HTMLElement | null = null
		private _teleport?: TTeleport
		/** Корень на своём месте: у слоя — в цели или на месте. */
		private _placed = true

		/** Свой признак поддерева — один на всё время жизни. */
		private readonly _subtree = new TSubtree()
		/** Признак предка — на эту сборку. */
		private _above?: TAbove

		private readonly _view: ITemplateContext<TInstance, TFacade, TOutputs, TOwnerFacade> =
			this._viewOf()

		constructor(...args: ConstructorParameters<TNativeElementClass>) {
			super(...args)
			markPlaceOwner(this)
			// Признак — месту при создании: раньше, чем соберётся кто-то под элементом
			provideSubtree(this, this._subtree)

			// Деталь владелец строит раньше её сборки: его набор ждёт поля
			if (plan.control) TElementAttributes.of(this).awaitField()
		}

		get state(): TBindingState<TInstance, TFacade, unknown, TOwnerFacade> {
			return this._binding?.state ?? {}
		}

		get ctrl(): TInstance | undefined {
			return this._binding?.ctrl ?? this._ctrl
		}

		set ctrl(value: TInstance | undefined) {
			this._ctrl = value
		}

		connectedCallback(): void {
			// Колбэк узла, снятого раньше своей очереди
			if (!this.isConnected) return

			// Живая связка — перенос силами базы
			if (this._connected || this._deferred) return

			const deferral = this._light.built ? undefined : this._deferralOf()

			if (deferral) {
				this._deferred = true
				deferral.defer(this, this._resume)

				return
			}

			if (isConnecting()) {
				this._deferred = true
				wait(this._resume)

				return
			}

			connecting(() => this._connect())
		}

		disconnectedCallback(): void {
			if (keepsBinding(this)) return

			this._connected = false
			this._above?.stop()
			this._above = undefined
			this._binding?.destroy()
			this._binding = undefined
			this._teleport?.release()

			// Снят со страницы — панели места уходят сразу; переставлен — вернутся при подключении
			if (!this.isConnected) TTeleport.recall(this)
		}

		attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
			// `id` поля, записанный из кода (`el.id`, `setAttribute`), — на поле, как
			// атрибут разметки. Снятие с корня — своё же, его база пропускает
			if (fieldId && name === CONTROL_ID) {
				if (value !== null) this._takeFieldId()

				return
			}

			const attribute = attributes.get(name)

			if (attribute) {
				// `undefined` тоже пишется: снятый атрибут возвращает проп к умолчанию
				this._write(attribute.prop, coerceAttribute(value, attribute))

				return
			}

			const property = own.get(name)

			if (property !== undefined) this._mark(property)
		}

		private readonly _resume = (): void => {
			this._deferred = false

			if (this.isConnected) this.connectedCallback()
		}

		/** Документ разбирается — главнее всего; под ждущим — его очередь; ожил при регистрации — её. */
		private _deferralOf(): TDeferral | undefined {
			const owner = this.ownerDocument

			if (owner.readyState === 'loading') return TDeferral.parsing(owner)

			return (
				TDeferral.above(this) ??
				(isUpgradedOnRegistration(this) || isUnderUpgrade(this)
					? TDeferral.registration
					: undefined)
			)
		}

		private _connect(): void {
			const again = this._light.built

			this._connected = true

			if (!again) {
				this._readAttributes()
				this._build()
			}

			this._assemble()
			this._above = followAbove(this, this._onAbove)

			// Панели места — к якорям: соберутся следом, с новым лифтом
			if (again) TTeleport.recall(this)

			// Узел плагинам отдаёт первая отрисовка, уже от признака предка
			this._flush(true)
		}

		private readonly _onAbove = (): void => {
			this._hide(this.state)
		}

		/** С полифилом колбэки атрибутов приходят после подключения — база их не ждёт. */
		private _readAttributes(): void {
			for (const [name, attribute] of attributes) {
				if (this._props.isGiven(attribute.prop) || !this.hasAttribute(name)) continue

				this._write(attribute.prop, coerceAttribute(this.getAttribute(name), attribute))
			}
		}

		private _write(name: string, value: unknown): void {
			this._props.write(name, value, this._binding)
		}

		private _assemble(): void {
			const props = this._props.open(this._root.localName)
			const binding = spec.setup(this, this._ctrl, props, this._onUpdate)

			this._binding = binding
			this._ctrl = binding.ctrl
			this._props.close(binding)
		}

		private _build(): void {
			const groups = this._light.gather()
			const parts = spec.template.create(this, this._view)

			if (fieldId) this._takeFieldId()
			if (plan.wrapped) this._root = built(parts.root, 'обёртку')

			const field = this._receiverOf(parts)

			if (field) {
				this._handOver(field)

				// После статики разметки: она главнее набора владельца
				if (plan.control) TElementAttributes.of(this).bindField(field)
			}

			if (plan.outerIsRoot) this._outer = this._root

			this._teleport = this._teleportOf(parts.companion)
			this._light.distribute(groups, parts.slots)
		}

		/** Кому уходит статика разметки: полю корня или корню внутри обёртки. */
		private _receiverOf(parts: TTemplateParts): HTMLElement | undefined {
			if (plan.wrapped) return this._root
			if (plan.control) return built(parts.control, 'поле')

			return undefined
		}

		/** `id` поля — с корня в проп; пустой снимает его, как у нативного `id`. */
		private _takeFieldId(): void {
			const id = this.getAttribute(CONTROL_ID)

			if (id === null) return

			this._write(CONTROL_ID, id === '' ? undefined : id)
			this.removeAttribute(CONTROL_ID)
		}

		/** Колбэков снятие не вызывает: ни один из этих атрибутов элемент не наблюдает. */
		private _handOver(target: HTMLElement): void {
			for (const name of this.getAttributeNames()) {
				if (plan.keep.has(name) || attributes.has(name) || own.has(name)) continue

				target.setAttribute(name, this.getAttribute(name) ?? '')
				this.removeAttribute(name)
			}
		}

		private _teleportOf(companion: HTMLElement | undefined): TTeleport | undefined {
			if (plan.layer === undefined) {
				if (companion) {
					throw new Error(
						'[soldy] Шаблон построил спутник корня, а описание корня слоя не объявляет',
					)
				}

				return undefined
			}

			this._companion = companion ?? null

			return new TTeleport(this, this._root, this._companion)
		}

		private readonly _onUpdate: TUpdateListener = (name, value) => {
			this._props.remember(name, value)
			this._mark(name)
		}

		/** Без подключения флаша нет: имя дождётся полной отрисовки следующего. */
		private _mark(name: string): void {
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

		private _viewOf(): ITemplateContext<TInstance, TFacade, TOutputs, TOwnerFacade> {
			const light = this._light
			const state = (): TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade> =>
				this._binding?.state ?? {}
			const instance = (): TInstance | undefined => this.ctrl
			const facade = (): TFacade | undefined => this._binding?.facade

			return {
				root: this,
				get content() {
					return light.content
				},
				get state() {
					return state()
				},
				get ctrl() {
					return instance()
				},
				get facade() {
					return facade()
				},
				hasSlot: (name) => light.has(name),
				slotted: (name) => light.slotted(name),
				showSlot: (name, shown) => light.show(name, shown),
				sample: (name) => light.sample(name),
			}
		}

		private _flush(full = false): void {
			// Состояние — по именам: у невизуального нет ни классов, ни наборов
			const state: TStateSnapshot = this.state
			const paint = TPaint.of(this._root)
			// Имена — до раскладки: смена во время неё дождётся своего флаша
			const dirty = new Set(this._dirty)
			const changed = (name: string) => full || dirty.has(name)

			this._dirty.clear()

			if (changed('classes')) paint.classes('own', classesOf(state['classes']))

			for (const [layer, output] of plan.sets) {
				if (changed(output)) {
					TElementAttributes.of(this._root).set(layer, setOf(state[output]), inputs)
				}
			}

			if (
				changed('layout_styles') ||
				(plan.style !== undefined && changed(plan.style)) ||
				(plan.order && changed('order'))
			) {
				paint.styles(
					'own',
					stylesOf(
						state['layout_styles'],
						plan.style === undefined ? undefined : state[plan.style],
						plan.order ? orderOf(state['order']) : undefined,
					),
				)
			}

			const layer = plan.layer
			const teleport = this._teleport
			const placing =
				layer !== undefined &&
				teleport !== undefined &&
				(full ||
					changed(layer.target) ||
					(layer.contained !== undefined && changed(layer.contained)))

			if (placing) this._placed = teleport.place(placeOf(state, layer))

			// Скрытие и свой признак — до привязок: вставленное ими соберётся под новым
			if (
				changed('rendered') ||
				changed('visible') ||
				placing ||
				(plan.shownBy !== undefined && changed(plan.shownBy))
			) {
				this._hide(state)
			}

			for (const binding of spec.template.bindings) {
				if (full || binding.props.some(changed)) binding.apply(this._view)
			}
		}

		/** Скрытие, узел плагинам и свой признак; узел отдаётся на каждый вызов — плагин тот же пропустит. */
		private _hide(state: TStateSnapshot): void {
			const { hidden, present, subtree } = presenceOf(
				plan,
				state,
				this._above?.present ?? true,
				this._placed,
			)

			TPaint.of(this._outer).hidden(hidden)

			if (this._companion) TPaint.of(this._companion).hidden(hidden)

			this._binding?.bindElement(present ? this._root : null)
			this._subtree.present = subtree
		}

		/**
		 * Свойства пропов всех дескрипторов, кроме `ctrl`, `HOST_PROPS` и свойств
		 * тега: `disabled` кнопки остаётся нативным и доходит до ядра атрибутом.
		 * Затем свойства своих атрибутов; занятое имя — ошибка описания.
		 */
		static {
			const props = new Set(
				descriptors.flatMap((descriptor) =>
					Object.keys(TSurface.of(descriptor, WebcProfile).exportProps),
				),
			)

			for (const prop of props) {
				if (prop === 'ctrl' || isHostProp(prop) || prop in Native.prototype) continue

				Object.defineProperty(this.prototype, prop, {
					configurable: true,
					enumerable: true,

					get(this: TElementBase) {
						return this._props.read(prop, this._binding)
					},

					set(this: TElementBase, value: unknown) {
						this._write(prop, value)
					},
				})
			}

			for (const [attribute, property] of own) {
				if (
					attributes.has(attribute) ||
					isHostProp(property) ||
					property in this.prototype
				) {
					throw new Error(
						`[soldy] Свой атрибут «${attribute}» занят: это имя уже у пропа, класса элемента или нативного элемента`,
					)
				}

				Object.defineProperty(this.prototype, property, {
					configurable: true,
					enumerable: true,

					get(this: TElementBase): string | null {
						return this.getAttribute(attribute)
					},

					set(this: TElementBase, value: unknown) {
						if (value === null || value === undefined) {
							this.removeAttribute(attribute)
						} else {
							this.setAttribute(attribute, String(value))
						}
					},
				})
			}
		}
	}

	return TElementBase
}
