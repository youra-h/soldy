/**
 * SoldyElement — элемент soldy поверх нативного элемента своего тега.
 *
 * Аналог TComponentBase из Angular: держит весь общий жизненный цикл, чтобы
 * компонент состоял только из дескриптора, setup-слоя и шаблона.
 *
 * Элемент soldy — встроенный элемент, расширенный своим классом (customized
 * built-in): `<button is="so-button">` — это настоящая `<button>`, а
 * `<div is="so-component-view">` — настоящий `<div>`. Класс элемента наследует
 * нативный класс тега (`HTMLButtonElement`), и всё, что браузер делает для
 * тега, он делает и для элемента soldy: кнопка отправляет форму, её
 * `submitter` — она сама, Enter в поле её нажимает, `formaction`,
 * `<fieldset disabled>`, `<label for>`, `:default`, фокус и доступность —
 * нативные. Повторять это руками нельзя: часть поведения браузер отдаёт только
 * своим элементам (`new FormData(form, submitter)` принимает только нативную
 * кнопку отправки). Прежние решения — автономный `<so-button>` с внутренней
 * `<button>`, а потом сам `<so-button>`, связанный с формой, — отменены.
 *
 * Safari расширять встроенные элементы не умеет и не собирается. Пакет
 * подключает полифил `@ungap/custom-elements` (вход пакета, `index.ts`): там,
 * где браузер умеет сам, он ничего не делает. С полифилом элементы оживают не
 * сразу, а микрозадачей позже вставки, и порядок колбэков у них другой:
 * `connectedCallback` раньше `attributeChangedCallback` начальных атрибутов.
 * Поэтому при подключении база читает атрибуты сама (`_readAttributes`) и не
 * ждёт колбэков: иначе ядро собралось бы без них, и атрибуты разметки дошли бы
 * до потребителя событиями `change:*`.
 *
 * Класс собирает фабрика `SoldyElement(HTMLButtonElement, { … })`: база одна,
 * а нативный класс у каждого тега свой.
 *
 * - connectedCallback: при первом подключении снимает свет и строит структуру
 *   шаблона в самом элементе; при каждом — новая связка над тем же инстансом,
 *   `bindElement(this)` и полная отрисовка. Первое подключение бывает
 *   отложено — см. ниже
 * - attributeChangedCallback: приводит атрибут к типу и пишет в Core
 * - disconnectedCallback: снимает подписки и уничтожает adapter-context;
 *   структура, свет и инстанс остаются у элемента
 *
 * Первая сборка — сразу при подключении: `el.ctrl` есть уже после вставки, на
 * это опираются приложения. Откладывается она в двух случаях, и оба раза
 * ждёт то, без чего собираться рано:
 * - пока документ разбирается — до `DOMContentLoaded`: элемент из разметки,
 *   определённый до неё (скрипт в `<head>`), подключается раньше, чем парсер
 *   дописал его детей, и свет оказался бы пустым;
 * - во время регистрации — на микрозадачу. Элемент, который уже стоит в
 *   документе, браузер оживляет внутри `customElements.define`
 *   (`defineElement`): синхронно, ещё при импорте пакета — раньше строк точки
 *   входа, где приложение подключает тему, иконки и свои плагины, а реестр
 *   действует только на компоненты, собранные после регистрации. Микрозадача
 *   приходит после синхронной части графа модулей. Тогда же такие элементы
 *   оживляет полифил в Safari, и момент для разметки страницы один во всех
 *   браузерах.
 * Элемент, которого к этому времени в документе нет, не собирается — его
 * соберёт следующее подключение.
 *
 * Тег — `localName` элемента (`button`): база отдаёт его ядру пропом `tag` при
 * каждой сборке. Атрибута и свойства `tag` нет (`HOST_PROPS`): тег элемента
 * задан разметкой. Для ядра это нативный тег: `role` и `tabindex` оно не пишет,
 * а `disabled` пишет нативным атрибутом, как у `<Button>` во Vue.
 *
 * То, что ядро пишет на корень, база раскладывает на элемент сама — это
 * одинаково у всех визуальных компонентов soldy (`root-attributes.ts`):
 *   classes              → классы, отдельными токенами
 *   aria, attrs, dataset → атрибуты (в `attrs` и `dir`: ядро уже перевело
 *                          'inherit' в null, а null снимает атрибут)
 *   layout_styles и      → стиль, по свойствам: снизу выход плагина
 *   стиль-выход            раскладки, поверх него стиль-выход компонента,
 *                          имена — как в CSS (`--*`, `z-index`)
 *   rendered, visible    → `display: none` поверх инлайнового `display`
 *                          потребителя, как `v-show`; при показе — прежнее
 *                          значение. Элемент потребителя компонент убрать не
 *                          может, поэтому `rendered=false` прячет, как
 *                          `visible=false`: содержимое остаётся на месте, а
 *                          `TElementPlugin` связан с элементом всё время
 * Что у компонентов разное, называет описание корня (`TRootSpec`): имя
 * стиль-выхода (`fractionStyle` у ProgressSpinner) и прячет ли видимость корень
 * (у Skeleton нет — она убирает только заглушку).
 *
 * Атрибуты, классы и свойства стиля потребителя главнее того, что пишет ядро:
 * по каждому имени база помнит, что поставила сама, своё пишет и снимает, а
 * чужое не трогает — `style.width` потребителя главнее размера от плагина, а
 * записанное в узел мимо раскладки переживает её смену. Кроме атрибутов-входов
 * пропов (`disabled`): они и есть проп, и значение ядра для них верно всегда.
 * Память — у элемента, а не у связки: связка новая на каждое подключение.
 *
 * Сборка — `createWebcAdapterContext` в setup-слое компонента: локаль
 * поддерева она берёт у ближайшего `<so-locale-provider>` вверх от элемента.
 * Связка заводится на подключение, поэтому элемент, переставленный под другой
 * провайдер, собирается уже с его локалью.
 *
 * Свойства пропов (`el.text = 'Click'`) база вешает на прототип, кроме тех, что
 * у элемента уже есть по тегу: `disabled` кнопки остаётся нативным свойством,
 * отражённым в атрибут, а до ядра доходит через атрибут.
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
 * переносится вручную в точки, объявленные шаблоном. Содержимое слота, которого
 * шаблон не объявил, не выводится: места для него в разметке компонента нет —
 * так же его не рисуют остальные адаптеры, и так же теневое дерево не рисует
 * свет, не попавший ни в один `<slot>`.
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
import type { ITemplate, ITemplateContext, TSlotTargets } from '../template'
import { isDefining } from './defineElement'
import {
	applyAttributes,
	applyClasses,
	applyHidden,
	applyStyles,
	stylesOf,
	type TAppliedAttributes,
	type TAppliedClasses,
	type TAppliedStyles,
	type THiddenDisplay,
} from './root-attributes'
import type { TBinding, TUpdateListener } from './useAdapter'

/** Наборы ядра, которые база раскладывает на корень. */
const ROOT_SETS = ['aria', 'attrs', 'dataset'] as const

type TRootSet = (typeof ROOT_SETS)[number]

/**
 * Содержимое ли узел: элемент или текст не из одних пробелов. Пробелы между
 * тегами — след переносов строк в разметке, а комментарий не рисуется.
 */
function isContent(node: ChildNode): boolean {
	if (node instanceof Element) return true

	return node instanceof Text && node.data.trim() !== ''
}

/**
 * Раскладывает свет по слотам и вынимает его из элемента.
 *
 * Признак — атрибут `slot` на элементе, как в стандарте. Текстовые узлы
 * атрибутов не имеют и всегда попадают в слот по умолчанию, поэтому
 * `<button is="so-button">Текст</button>` работает как у нативной кнопки.
 *
 * Слот, в котором нет содержимого (`isContent`), — не задан, и его узлы
 * отбрасываются. Иначе пробелы вокруг `<svg slot="leading">` на своей строке
 * стали бы слотом по умолчанию и заглушили бы проп `text` — компилятор Vue
 * такие пробелы и комментарии выбрасывает, и одна разметка вела бы себя
 * по-разному. Пробелы внутри содержимого (`<b>Сохранить</b> <i>файл</i>`)
 * остаются.
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

	for (const [name, group] of groups) {
		if (!group.some(isContent)) groups.delete(name)
	}

	return groups
}

/** Что у элемента своего, помимо нативного: инстанс ядра и его состояние. */
export interface ISoldyElement<TInstance> {
	/** Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`. */
	readonly state: TInstanceState<TInstance>
	/**
	 * Готовый core-инстанс. Связку элемент заводит на каждое подключение, и
	 * присвоенный инстанс достаётся следующей: подключённому элементу — после
	 * перестановки. Без присвоения это инстанс, который создала первая сборка.
	 */
	ctrl: TInstance | undefined
	/** Колбэки жизненного цикла custom element: их зовёт браузер (или полифил). */
	connectedCallback(): void
	disconnectedCallback(): void
	attributeChangedCallback(name: string, old: string | null, value: string | null): void
}

/**
 * Описание корня — то, что база раскладывает на элемент по-разному у разных
 * компонентов. Нет его — корень как у всех: стиль только от плагина
 * раскладки, видимость прячет корень.
 *
 * - `style` — имя стиль-выхода компонента в состоянии: стиль, который считает
 *   ядро (`fractionStyle` у ProgressSpinner). Имя у каждого компонента своё,
 *   поэтому его называет компонент, как наборы ядра во Vue называет разметка.
 *   Ложится поверх выхода плагина раскладки;
 * - `hides` — прячут ли `visible` и `rendered` корень, по умолчанию да. У
 *   Skeleton нет: они убирают только заглушку, а содержимое в корне остаётся
 *   на виду.
 */
export type TRootSpec = {
	readonly style?: string
	readonly hides?: boolean
}

/** Всё, чем элементы soldy отличаются друг от друга. */
export interface ISoldyElementSpec<TInstance> {
	/** Дескриптор компонента: по нему строятся атрибуты и свойства пропов. */
	readonly descriptor: IComponentDescriptor
	/** Шаблон: структура в корне и привязки пропов. */
	readonly template: ITemplate<TInstance>
	/** Описание корня — см. `TRootSpec`. */
	readonly root?: TRootSpec
	/** setup-слой компонента: связка над готовым инстансом или новым. */
	setup(
		host: HTMLElement,
		ctrl: TInstance | undefined,
		props: Record<string, unknown>,
		onUpdate: TUpdateListener,
	): TBinding<TInstance>
}

/**
 * Нативный класс тега: `HTMLButtonElement`, `HTMLDivElement`. Rest-параметр
 * `any[]` — форма конструктора миксина, без неё TypeScript не сложит класс
 * базы с нативным.
 */
export type TNativeElementClass = new (...args: any[]) => HTMLElement

/** Класс элемента soldy — то, что база добавляет к нативному классу тега. */
export type TSoldyElementClass<TInstance> = (new (...args: any[]) => ISoldyElement<TInstance>) & {
	readonly observedAttributes: string[]
}

/**
 * Класс элемента soldy поверх нативного класса тега.
 *
 * Тип результата объявлен явно — нативный класс плюс своё (`ISoldyElement`):
 * класс, выведенный из выражения, TypeScript в декларации не выпустит, у него
 * приватные члены.
 */
export function SoldyElement<
	TNative extends TNativeElementClass,
	TInstance extends IComponentView<IComponentViewProps, any>,
>(Native: TNative, spec: ISoldyElementSpec<TInstance>): TNative & TSoldyElementClass<TInstance> {
	const attributes: ReadonlyMap<string, IAttributeBinding> = buildAttributeMap(spec.descriptor)
	/** Атрибуты-входы пропов: их значение в наборе ядра верно всегда. */
	const inputs: ReadonlySet<string> = new Set(attributes.keys())
	/** Имя стиль-выхода компонента (`TRootSpec.style`); нет — стиль только от плагина. */
	const styleOutput = spec.root?.style
	/** Прячет ли видимость корень (`TRootSpec.hides`). */
	const hides = spec.root?.hides ?? true

	class TSoldyElement extends Native implements ISoldyElement<TInstance> {
		static get observedAttributes(): string[] {
			return [...attributes.keys()]
		}

		private _binding?: TBinding<TInstance>

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
		/** Узел слота по умолчанию; пока структуры нет — сам элемент. */
		private _content: HTMLElement = this
		private readonly _dirty = new Set<string>()
		private _flushQueued = false
		private _connected = false
		/** Первое подключение отложено (см. шапку). */
		private _deferred = false

		/** Память раскладки корня: что поставила база (см. `root-attributes.ts`). */
		private _appliedClasses: TAppliedClasses = new Set()
		private readonly _appliedSets: Record<TRootSet, TAppliedAttributes> = {
			aria: new Map(),
			attrs: new Map(),
			dataset: new Map(),
		}
		private _appliedStyles: TAppliedStyles = new Map()
		private _hiddenDisplay: THiddenDisplay = undefined

		get state(): TInstanceState<TInstance> {
			return this._binding?.state ?? {}
		}

		get ctrl(): TInstance | undefined {
			return this._binding?.ctrl ?? this._ctrl
		}

		set ctrl(value: TInstance | undefined) {
			this._ctrl = value
		}

		connectedCallback(): void {
			if (this._connected || this._deferred) return

			if (!this._light) {
				// Первое подключение, пока документ разбирается, — после разбора:
				// детей элемента парсер ещё не дописал
				if (this.ownerDocument.readyState === 'loading') {
					this._deferred = true
					this.ownerDocument.addEventListener('DOMContentLoaded', this._resume, {
						once: true,
					})

					return
				}

				// Ожил при регистрации — микрозадачей позже: следующими строками
				// точки входа приложение подключает тему, иконки и плагины
				if (isDefining()) {
					this._deferred = true
					queueMicrotask(this._resume)

					return
				}
			}

			this._connected = true

			// Структура — один раз: перестановка в DOM её не пересоздаёт
			if (!this._light) {
				this._readAttributes()
				this._build()
			}

			this._assemble().bindElement(this)
			this._flush(true)
		}

		disconnectedCallback(): void {
			this._connected = false
			this._binding?.destroy()
			this._binding = undefined
		}

		attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
			const attribute = attributes.get(name)

			if (!attribute) return

			// `undefined` тоже пишется: атрибут сняли — проп больше не задан, и
			// связка вернёт его к умолчанию
			this._write(attribute.prop, coerceAttribute(value, attribute))
		}

		/**
		 * Отложенное первое подключение — после разбора документа или микрозадачей
		 * позже регистрации, если элемент ещё в документе.
		 */
		private readonly _resume = (): void => {
			this._deferred = false

			if (this.isConnected) this.connectedCallback()
		}

		/**
		 * Атрибуты разметки — пропсами первой сборки. Колбэков база не ждёт: с
		 * полифилом они приходят после подключения (см. шапку). Пришедшие потом
		 * с тем же значением ядро не меняют. Проп, уже заданный свойством до
		 * подключения, главнее атрибута, как и при записи после.
		 */
		private _readAttributes(): void {
			for (const [name, attribute] of attributes) {
				if (this._given.has(attribute.prop) || !this.hasAttribute(name)) continue

				this._write(attribute.prop, coerceAttribute(this.getAttribute(name), attribute))
			}
		}

		/** Свойство пропа: значение из JS — `el.text = 'x'`. */
		private _read(name: string): unknown {
			if (this._offline.has(name)) return this._offline.get(name)

			// Props без триггеров (pluginProps) в state не попадают — их помнит элемент
			if (this._binding && Object.hasOwn(this._binding.state, name)) {
				return Reflect.get(this._binding.state, name)
			}

			return this._values.get(name)
		}

		private _write(name: string, value: unknown): void {
			this._given.add(name)

			if (!this._binding) {
				this._offline.set(name, value)

				return
			}

			// Значение пропа с триггерами вернёт ядро — то, что оно приняло. Сквозной
			// проп (без триггеров) ядро не отдаёт, и его значение помнит элемент
			if (!Object.hasOwn(this._binding.state, name)) this._values.set(name, value)

			this._binding.syncProps({ [name]: value })
		}

		/**
		 * Новая связка над тем же инстансом.
		 *
		 * Пропсы сборки — заданные потребителем в последнем значении, которое видел
		 * элемент, поверх — записанное без связки, и тег элемента. Снятое без связки
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

			const binding = spec.setup(this, this._ctrl, props, (name, value) =>
				this._onUpdate(name, value),
			)

			this._binding = binding
			// Инстанс первой сборки — следующим: перестановка не подменяет `el.ctrl`
			this._ctrl = binding.ctrl

			const removed = [...offline].filter(([, value]) => value === undefined)

			if (removed.length > 0) binding.syncProps(Object.fromEntries(removed))

			return binding
		}

		/**
		 * Снимает свет и строит структуру шаблона в элементе — один раз, при первом
		 * подключении. Дальше свет живёт в структуре, и снимать его заново нельзя: в
		 * элементе уже своя разметка, и при перестановке она попала бы в свет.
		 */
		private _build(): void {
			const light = groupBySlot(Array.from(this.childNodes))
			const targets = spec.template.create(this)

			// Слоты не наследуются: слота по умолчанию может не быть вовсе
			// (ProgressSpinner), и узлом содержимого тогда остаётся корень
			const fallback = targets[DEFAULT_SLOT]

			this._content = fallback?.mode === 'append' ? fallback.node : this
			this._light = light
			this._distribute(light, targets)
		}

		/**
		 * Раскладывает свет по точкам, объявленным шаблоном. Слот, которого шаблон
		 * не объявил, места в разметке не имеет, и его содержимое не выводится (см.
		 * шапку): в корне оно оказалось бы там, где компонент его не ждёт, — текст
		 * внутри кольца ProgressSpinner вошёл бы в узел с ролью `progressbar`.
		 */
		private _distribute(light: ReadonlyMap<string, ChildNode[]>, targets: TSlotTargets): void {
			for (const [name, nodes] of light) {
				const target = targets[name]

				if (!target) continue

				for (const node of nodes) {
					if (target.mode === 'append') {
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
			// обратную запись атрибута-входа `disabled`), дождётся своего флаша, а не
			// пропадёт
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
						inputs,
					)
				}
			}

			// Снизу выход плагина раскладки, поверх — стиль-выход компонента. Их
			// имена — не свойства инстанса, поэтому состояние читается по именам
			if (changed('layout_styles') || (styleOutput !== undefined && changed(styleOutput))) {
				const snapshot: TStateSnapshot = state

				this._appliedStyles = applyStyles(
					this,
					stylesOf(
						snapshot['layout_styles'],
						styleOutput === undefined ? undefined : snapshot[styleOutput],
					),
					this._appliedStyles,
				)
			}

			// Скрытие — поверх стиля: `display: none` не перекрывает ни раскладка,
			// ни потребитель
			if (hides && (changed('rendered') || changed('visible'))) {
				this._hiddenDisplay = applyHidden(
					this,
					state.rendered === false || state.visible === false,
					this._hiddenDisplay,
				)
			}

			const context = this._context()

			for (const binding of spec.template.bindings) {
				if (full || binding.props.some(changed)) binding.apply(context)
			}
		}

		/**
		 * Свойства пропов на прототипе — JS-путь `el.text = 'Click'`. Атрибуты
		 * покрывают только примитивы, поэтому свойства — единственный способ
		 * передать объект или готовый инстанс. Пропускаются `ctrl` (своя пара
		 * выше), пропы `HOST_PROPS` и свойства, которые у элемента уже есть по
		 * тегу: нативное свойство остаётся нативным (см. шапку).
		 */
		static {
			for (const prop of Object.keys(TSurface.of(spec.descriptor, WebcProfile).exportProps)) {
				if (prop === 'ctrl' || isHostProp(prop) || prop in Native.prototype) continue

				Object.defineProperty(this.prototype, prop, {
					configurable: true,
					enumerable: true,

					get(this: TSoldyElement) {
						return this._read(prop)
					},

					set(this: TSoldyElement, value: unknown) {
						this._write(prop, value)
					},
				})
			}
		}
	}

	return TSoldyElement
}
