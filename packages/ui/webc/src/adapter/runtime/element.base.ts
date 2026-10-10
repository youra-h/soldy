/**
 * TSoldyElement — базовый класс кастомного элемента soldy.
 *
 * Аналог TComponentBase из Angular: держит весь общий жизненный цикл, чтобы
 * компонент состоял только из дескриптора, setup-слоя и ссылки на шаблон.
 *
 * Обёртки нет: корень компонента — сам хост. `<so-button>` и есть кнопка, и
 * всё, что потребитель написал на элементе, — `class`, `style`, атрибуты,
 * слушатели — относится к корню и действует сразу, без проброса. Раньше
 * `<so-button>` был обёрткой с `<button>` внутри, и написанное на нём до
 * кнопки не доходило.
 *
 * - constructor: у элемента, связанного с формой (`static formAssociated`), —
 *   `attachInternals()`
 * - connectedCallback: при первом подключении снимает свет и строит структуру
 *   шаблона в самом хосте; при каждом — новая связка над тем же инстансом,
 *   `bindElement(this)` и полная отрисовка
 * - attributeChangedCallback: приводит атрибут к типу и пишет в Core
 * - disconnectedCallback: снимает подписки и уничтожает adapter-context;
 *   структура, свет и инстанс остаются у элемента
 *
 * Тег — `localName` хоста: база отдаёт его ядру пропом `tag` при каждой
 * сборке. Атрибута и свойства `tag` нет (`HOST_PROPS`): имя тега у живого
 * элемента не меняется. Для ядра `so-button` — не нативный тег: `role`,
 * `tabindex` и `aria-disabled` оно пишет само, а Enter и пробел превращает в
 * `press` `TActionPlugin`.
 *
 * То, что ядро пишет на корень, база раскладывает на хост сама — это одинаково
 * у всех визуальных компонентов soldy (`root-attributes.ts`):
 *   classes              → классы, отдельными токенами
 *   aria, attrs, dataset → атрибуты (в `attrs` и `dir`: ядро уже перевело
 *                          'inherit' в null, а null снимает атрибут)
 *   rendered, visible    → `display: none` поверх инлайнового `display`
 *                          потребителя, как `v-show`; при показе — прежнее
 *                          значение. Хост потребителя компонент убрать не
 *                          может, поэтому `rendered=false` прячет, как
 *                          `visible=false`: содержимое остаётся на месте, а
 *                          `TElementPlugin` связан с хостом всё время
 *   disabled             → нативный атрибут у элемента, связанного с формой
 * Атрибуты и классы потребителя главнее того, что пишет ядро: по каждому имени
 * база помнит, что поставила сама, своё пишет и снимает, а чужое не трогает.
 * Память — у элемента, а не у связки: связка новая на каждое подключение.
 *
 * Элемент, связанный с формой (FACE, `static formAssociated = true` — так у
 * Button), получает `ElementInternals` в конструкторе. Его форма —
 * `internals.form`: форма-предок или форма из атрибута `form`, а что с ней
 * делать, объявляет шаблон реакцией на событие ядра (`ITemplate.reactions`) —
 * у Button это `formAction` на `action:press`. Нативный `disabled` у такого
 * элемента — настоящее выключение: ни фокуса, ни кликов. Ядро для `so-button`
 * его в `attrs` не пишет (тег не из `NATIVE_DISABLED_TAGS`), поэтому атрибут
 * ведёт база по `disabled` ядра — иначе `<so-button disabled>` после
 * `el.disabled = false` осталась бы нерабочей. Обратная запись приходит в
 * `attributeChangedCallback` тем же значением и гаснет в сеттере.
 * `aria-disabled` ядра остаётся рядом: это одно и то же состояние.
 *
 * Перестановка в DOM — отключение и подключение — элемент не ломает. Свет и
 * структура создаются один раз, а каждое подключение — новая связка над тем же
 * инстансом: инстанс первой сборки следующая получает как `ctrl`, и `el.ctrl`
 * не меняется. Пропсы сборки — то, что задал потребитель атрибутом или
 * свойством, в последнем значении, которое видел элемент: перестановка не
 * откатывает то, что с тех пор поменяло ядро. Записанное без связки — до
 * подключения или вне DOM — ложится поверх (`_assemble`).
 *
 * Обновления точечные. Подписка на связку (`subscribe`) сообщает, какой именно проп
 * изменился; имена копятся в `_dirty`, а на флаше применяются только те
 * привязки, которые за эти пропы отвечают. Сам флаш откладывается в
 * микротаску, потому что одно изменение в ядре часто даёт несколько триггеров.
 *
 * Слоты распределяются по атрибуту `slot` — это нативная HTML-семантика, а
 * не выдумка soldy. Shadow DOM для этого не используется: тема раскладывается
 * глобальными BEM-классами и через теневую границу не проходит, поэтому свет
 * переносится вручную в точки, объявленные шаблоном.
 */

import type { IComponentView, IComponentViewProps } from '@soldy-ui/core'
import {
	DEFAULT_SLOT,
	TSurface,
	type IComponentDescriptor,
	type TInstanceState,
	type TStateSnapshot,
} from '@soldy-ui/setup'
import {
	buildAttributeMap,
	coerceAttribute,
	isHostProp,
	type IAttributeBinding,
	WebcProfile,
} from '../common'
import type {
	ITemplate,
	ITemplateContext,
	ITemplateReactionContext,
	TSlotTargets,
} from '../template'
import {
	applyAttributes,
	applyClasses,
	applyHidden,
	type TAppliedAttributes,
	type TAppliedClasses,
	type THiddenDisplay,
} from './root-attributes'
import type { TBinding, TEventListener, TUpdateListener } from './useAdapter'

/** Кэш карт атрибутов по дескриптору — строить её на каждый элемент незачем. */
const ATTRIBUTE_MAPS = new WeakMap<IComponentDescriptor, Map<string, IAttributeBinding>>()

/** Наборы ядра, которые база раскладывает на корень-хост. */
const ROOT_SETS = ['aria', 'attrs', 'dataset'] as const

type TRootSet = (typeof ROOT_SETS)[number]

/**
 * Раскладывает свет по слотам и вынимает его из хоста.
 *
 * Признак — атрибут `slot` на элементе, как в стандарте. Текстовые узлы
 * атрибутов не имеют и всегда попадают в слот по умолчанию, поэтому
 * `<so-button>Текст</so-button>` работает как раньше.
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

export abstract class TSoldyElement<
	TInstance extends IComponentView<IComponentViewProps, any> = IComponentView,
> extends HTMLElement {
	/**
	 * Связан ли элемент с формой (FACE). Объявляет класс элемента, а читают
	 * реестр `customElements` и конструктор базы: по нему она заводит
	 * `ElementInternals` (см. шапку).
	 */
	static formAssociated = false

	protected binding?: TBinding<TInstance>

	/**
	 * Геттеры/сеттеры для всех props дескриптора на прототипе — JS-путь
	 * `el.text = 'Click'`. Атрибуты покрывают только примитивы, поэтому свойства —
	 * единственный способ передать объект или готовый инстанс.
	 *
	 * Метод класса, а не внешняя функция: `getProp`/`setProp` защищённые, и
	 * только тело класса обращается к ним без приведения. `ctrl` пропускается —
	 * у него своя пара ниже: читать его нужно из буфера, а не из state. Пропы
	 * `HOST_PROPS` — тоже: у элемента их нет.
	 */
	static defineProps(descriptor: IComponentDescriptor): void {
		for (const prop of Object.keys(TSurface.of(descriptor, WebcProfile).exportProps)) {
			if (prop === 'ctrl' || isHostProp(prop)) continue
			if (Object.prototype.hasOwnProperty.call(this.prototype, prop)) continue

			Object.defineProperty(this.prototype, prop, {
				configurable: true,
				enumerable: true,

				get(this: TSoldyElement) {
					return this.getProp(prop)
				},

				set(this: TSoldyElement, value: unknown) {
					this.setProp(prop, value)
				},
			})
		}
	}

	/** Дескриптор компонента — нужен для карты атрибутов. */
	protected abstract get descriptor(): IComponentDescriptor

	/** Шаблон компонента: структура в корне, привязки и реакции. */
	protected abstract get template(): ITemplate<TInstance>

	/** Создаёт binding через setup-слой компонента. */
	protected abstract setup(
		ctrl: TInstance | undefined,
		props: Record<string, unknown>,
		onUpdate: TUpdateListener,
		onEvent: TEventListener,
	): TBinding<TInstance>

	/**
	 * Связь с формой — только у элемента, связанного с формой: у остальных
	 * `internals.form` бросает исключение, и читать его нельзя.
	 */
	private readonly _internals: ElementInternals | null

	/**
	 * Последнее значение каждого пропа, какое видел элемент: записанное
	 * потребителем или пришедшее из ядра. Его отдают свойства, когда связки нет,
	 * и из него берутся пропсы сборки.
	 */
	private readonly _values = new Map<string, unknown>()
	/** Пропы, которые задавал потребитель, — атрибутом или свойством. */
	private readonly _given = new Set<string>()
	/** Записанное без связки — до подключения или вне DOM: дойдёт до ядра при подключении. */
	private _offline = new Map<string, unknown>()

	/** Готовый core-инстанс: выставленный потребителем или созданный первой сборкой. */
	private _ctrl?: TInstance
	/** Свет, сгруппированный по имени слота; `null` — структура ещё не построена. */
	private _light: Map<string, ChildNode[]> | null = null
	/** Узел слота по умолчанию; пока структуры нет — сам хост. */
	private _content: HTMLElement = this
	private readonly _dirty = new Set<string>()
	private _flushQueued = false
	private _connected = false

	/** Память раскладки корня: что поставила база (см. `root-attributes.ts`). */
	private _appliedClasses: TAppliedClasses = new Set()
	private readonly _appliedSets: Record<TRootSet, TAppliedAttributes> = {
		aria: new Map(),
		attrs: new Map(),
		dataset: new Map(),
	}
	private _hiddenDisplay: THiddenDisplay = undefined

	constructor() {
		super()

		// Класс элемента, а не базы: `formAssociated` объявляет он
		this._internals = new.target.formAssociated ? this.attachInternals() : null
	}

	get state(): TInstanceState<TInstance> {
		return this.binding?.state ?? {}
	}

	/**
	 * Готовый core-инстанс. Связку элемент заводит на каждое подключение, и
	 * присвоенный инстанс достаётся следующей: подключённому элементу — после
	 * перестановки. Без присвоения это инстанс, который создала первая сборка.
	 */
	get ctrl(): TInstance | undefined {
		return this.binding?.ctrl ?? this._ctrl
	}

	set ctrl(value: TInstance | undefined) {
		this._ctrl = value
	}

	connectedCallback(): void {
		if (this._connected) return

		this._connected = true

		// Структура — один раз: перестановка в DOM её не пересоздаёт
		if (!this._light) this._build()

		this._assemble().bindElement(this)
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

		// `undefined` тоже пишется: атрибут сняли — проп больше не задан, и
		// связка вернёт его к умолчанию
		this._write(attribute.prop, coerceAttribute(value, attribute))
	}

	/** Установка значения из JS: `el.text = 'x'`. */
	protected setProp(name: string, value: unknown): void {
		this._write(name, value)
	}

	protected getProp(name: string): unknown {
		if (this._offline.has(name)) return this._offline.get(name)

		// Props без триггеров (pluginProps) в state не попадают — их помнит элемент
		if (this.binding && Object.hasOwn(this.binding.state, name)) {
			return Reflect.get(this.binding.state, name)
		}

		return this._values.get(name)
	}

	private _write(name: string, value: unknown): void {
		this._given.add(name)

		if (!this.binding) {
			this._offline.set(name, value)

			return
		}

		// Значение пропа с триггерами вернёт ядро — то, что оно приняло. Сквозной
		// проп (без триггеров) ядро не отдаёт, и его значение помнит элемент
		if (!Object.hasOwn(this.binding.state, name)) this._values.set(name, value)

		this.binding.syncProps({ [name]: value })
	}

	/**
	 * Новая связка над тем же инстансом.
	 *
	 * Пропсы сборки — заданные потребителем в последнем значении, которое видел
	 * элемент, поверх — записанное без связки, и тег хоста. Снятое без связки
	 * (`undefined`) сборка не донесла бы: она пропускает `undefined` и вернуть
	 * проп к умолчанию не может. Поэтому у такого пропа в сборку уходит прежнее
	 * значение, а снятие доходит следом записью в связку — как снятие атрибута у
	 * подключённого элемента.
	 */
	private _assemble(): TBinding<TInstance> {
		const offline = this._offline
		const props: Record<string, unknown> = {}

		for (const name of this._given) props[name] = this._values.get(name)

		for (const [name, value] of offline) {
			if (value !== undefined) props[name] = value
		}

		props['tag'] = this.localName

		this._offline = new Map()

		for (const [name, value] of offline) this._values.set(name, value)

		const binding = this.setup(
			this._ctrl,
			props,
			(name, value) => this._onUpdate(name, value),
			(name) => this._onEvent(name),
		)

		this.binding = binding
		// Инстанс первой сборки — следующим: перестановка не подменяет `el.ctrl`
		this._ctrl = binding.ctrl

		const removed = [...offline].filter(([, value]) => value === undefined)

		if (removed.length > 0) binding.syncProps(Object.fromEntries(removed))

		return binding
	}

	/**
	 * Снимает свет и строит структуру шаблона в хосте — один раз, при первом
	 * подключении. Дальше свет живёт в структуре, и снимать его заново нельзя: в
	 * хосте уже своя разметка, и при перестановке она попала бы в свет.
	 */
	private _build(): void {
		const light = groupBySlot(Array.from(this.childNodes))
		const targets = this.template.create(this)

		// Слот по умолчанию объявлен у любого визуального слоя, но шаблон вправе
		// не иметь других: тогда содержимое просто ляжет в корень.
		const fallback = targets[DEFAULT_SLOT]

		this._content = fallback?.mode === 'append' ? fallback.node : this
		this._light = light
		this._distribute(light, targets)
	}

	/** Раскладывает свет по точкам, объявленным шаблоном. */
	private _distribute(light: ReadonlyMap<string, ChildNode[]>, targets: TSlotTargets): void {
		for (const [name, nodes] of light) {
			const target = targets[name]

			for (const node of nodes) {
				if (!target) {
					// Слот не объявлен шаблоном — содержимое не теряем, кладём в корень
					this.appendChild(node)
				} else if (target.mode === 'append') {
					target.node.appendChild(node)
				} else {
					target.node.parentNode?.insertBefore(node, target.node)
				}
			}
		}
	}

	private _onUpdate(name: string, value: unknown): void {
		this._values.set(name, value)
		this._dirty.add(name)
		this._queueFlush()
	}

	/** Ядро сообщило о событии — после `CustomEvent` идут реакции шаблона на него. */
	private _onEvent(name: string): void {
		const reactions = this.template.reactions.filter((reaction) => reaction.event === name)

		if (reactions.length === 0) return

		const context: ITemplateReactionContext<TInstance> = {
			...this._context(),
			form: this._internals?.form ?? null,
		}

		for (const reaction of reactions) reaction.apply(context)
	}

	private _queueFlush(): void {
		if (this._flushQueued || !this._connected) return

		this._flushQueued = true

		queueMicrotask(() => {
			this._flushQueued = false

			if (this._connected) this._flush()
		})
	}

	private _context(): ITemplateContext<TInstance> {
		const light = this._light

		return {
			root: this,
			content: this._content,
			state: this.state,
			hasSlot: (name) => (light?.get(name)?.length ?? 0) > 0,
		}
	}

	private _flush(full = false): void {
		const state = this.state
		// Имена забираются до раскладки: изменение, пришедшее во время неё (через
		// обратную запись атрибута `disabled`), дождётся своего флаша, а не пропадёт
		const dirty = new Set(this._dirty)
		const changed = (name: string) => full || dirty.has(name)

		this._dirty.clear()

		if (changed('classes')) {
			this._appliedClasses = applyClasses(this, state.classes ?? [], this._appliedClasses)
		}

		// Память у каждого набора своя: снятие записи в одном не уносит чужие
		for (const name of ROOT_SETS) {
			if (changed(name)) {
				this._appliedSets[name] = applyAttributes(
					this,
					state[name] ?? {},
					this._appliedSets[name],
				)
			}
		}

		if (changed('rendered') || changed('visible')) {
			this._hiddenDisplay = applyHidden(
				this,
				state.rendered === false || state.visible === false,
				this._hiddenDisplay,
			)
		}

		if (this._internals && changed('disabled')) this._syncDisabled()

		const context = this._context()

		for (const binding of this.template.bindings) {
			if (full || binding.props.some(changed)) binding.apply(context)
		}
	}

	/**
	 * Нативный `disabled` элемента, связанного с формой, — по `disabled` ядра
	 * (см. шапку). Инстанса база не знает, у него может и не быть `disabled`,
	 * поэтому значение читается по имени. `toggleAttribute` не трогает атрибут,
	 * который уже такой, и обратной записи тогда не шлёт.
	 */
	private _syncDisabled(): void {
		const state: TStateSnapshot = this.state

		this.toggleAttribute('disabled', state['disabled'] === true)
	}
}
