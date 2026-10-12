/**
 * TComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: связывает корень компонента с TElementPlugin по описанию
 *   корня (`TRootSpec`), у корня-хоста ещё снимает с элемента атрибуты-входы
 * - state: сигнал состояния Core (шаблон подписывается сам, без ChangeDetectorRef)
 * - ngOnInit: создаёт binding (createBinding) из заданных inputs — у корня-хоста
 *   вместе с его тегом — в контексте инъекции компонента и ставит приёмник
 *   событий ядра для выходов (syncEvents)
 * - ngOnChanges: пробрасывает изменённые inputs в Core (syncInputs)
 * - ngOnDestroy: очищает подписки и adapter.destroy()
 *
 * Подкласс обязан реализовать:
 * - createBinding(ctrl, inputs): создаёт TBinding через setup-функцию
 * - super(inputNames, root?) в конструкторе: имена входов и описание корня —
 *   `{ strategy: 'host' }`, когда корень — сам элемент потребителя (Button,
 *   ComponentView, Icon), или `{ strategy: 'view' }` (по умолчанию), когда
 *   корень живёт в шаблоне. У корня-хоста там же — имя стиль-выхода
 *   компонента, прячет ли корень его видимость и уезжает ли он в слой (см.
 *   `TRootSpec`).
 *
 * Описание передаётся через конструктор (а не getter), т.к. оно нужно уже в
 * конструкторе, а TS запрещает обращение к абстрактному свойству в
 * конструкторе; имена входов — тем же вызовом.
 *
 * Корень-хост (`'host'`) — элемент, на котором потребитель написал селектор:
 * `<button so-button>`, `<a so-button href>`, `<div so-button>`. Всё, что
 * потребитель написал на элементе, относится к корню и работает без проброса,
 * а то, что пишет на корень ядро, раскладывает сама база — у компонентов нет
 * ни привязок хоста, ни эффектов:
 *
 * - тег — `localName` хоста. Имя тега у живого элемента не меняется, поэтому
 *   входа `tag` нет (`useInputs`): тег уходит ядру обычным пропом в сборку
 *   вместе с входами, а внешнему `ctrl` сборка пишет его сеттером;
 * - статический атрибут с именем входа (`text`, `size`, `disabled`,
 *   `aria_label`) — запись входа, а не атрибут. Angular ставит его на элемент
 *   ещё до конструктора, а значение входа берёт из скомпилированного шаблона, а
 *   не из DOM, поэтому база снимает такие атрибуты с хоста в конструкторе.
 *   Нативный `disabled` ведут только `attrs` ядра: иначе статический атрибут
 *   пережил бы включение кнопки;
 * - скрытие (`rendered` или `visible` равно `false`) — привязка хоста
 *   `[style.display]` этой директивы, её наследует каждый компонент. Со стилем
 *   потребителя её сливает Angular: `style`, `[style.x]` и `[style]`
 *   потребителя ставятся и снимаются сами, а шаблон потребителя главнее
 *   привязок хоста, поэтому инлайновый `display` потребителя главнее скрытия —
 *   во Vue и React наоборот. Перекрыть его можно только записью в обход стилей
 *   Angular, а такая запись спорила бы с его привязками. Корень, который
 *   видимость не прячет (`hides: false` — Skeleton), привязка не трогает;
 * - классы ядра и наборы `aria`, `attrs`, `dataset` — эффекты базы, и
 *   атрибуты и классы потребителя главнее них (`root-attributes.ts`). Классы —
 *   не привязка хоста `[class]`: статику шаблона потребителя Angular сверяет
 *   только у первой привязки директивы к классам или стилям (`directiveStylingLast`
 *   у узла одно на те и другие), а `[class]` компилятор ставит раньше
 *   `[style.*]`. С ней статический `style="display: …"` потребителя проигрывал
 *   бы скрытию, а у видимого корня снимался бы вовсе. `class`, `[class.x]` и
 *   `[ngClass]` потребителя ставят и снимают только свои имена;
 * - стиль — тоже эффект базы, по свойствам: снизу выход плагина раскладки
 *   (`layout_styles`), поверх него стиль-выход компонента (`fractionStyle` у
 *   ProgressSpinner), а свойство с чужим значением — потребителя или плагина,
 *   записавшего его в узел сам, — база не трогает (`root-attributes.ts`). Не
 *   привязка хоста `[style]` — по той же причине, что классы: она стала бы
 *   первой привязкой стилей директивы. `[style.display]` скрытия остаётся
 *   привязкой;
 * - `rendered=false` прячет корень, как `visible=false`: убрать элемент
 *   потребителя компонент не может. Содержимое остаётся, `TElementPlugin`
 *   связан с хостом всё время;
 * - слой (`TRootSpec.teleport` — Frame) уезжает в цель сам: элемент
 *   потребителя, со всем, что на нём написано, переносит `teleportRoot`
 *   (`teleport.ts`) — в браузере и после отрисовки. Пока корень не в цели и
 *   не на месте — на сервере, до переноса, без цели, — скрытие его прячет.
 *
 * Сборка (`createBinding`) идёт в контексте инъекции компонента
 * (`runInInjectionContext`): обёртка сборки
 * (`createAngularAdapterContext`) берёт из него локаль ближайшего
 * `LocaleProviderDirective`. Сам `ngOnInit` в контексте не выполняется.
 *
 * Эмиттеров заранее база не заводит. Выход — геттер, который кодогенератор
 * пишет в `T<Имя>Surface`, по одному на класс; первое чтение выхода — привязка
 * в шаблоне потребителя или подписка из кода — зовёт `createOutput`, и эмиттер
 * становится собственным свойством экземпляра. Приёмник событий ядра отдаёт
 * событие только такому, уже заведённому эмиттеру: на выход, который никто не
 * читал, отдавать некому.
 *
 * Входы идут по списку имён, поэтому в типе базы их нет, как и выходов.
 * Объявляет их и даёт им тип сгенерированный наследник `T<Имя>Surface`
 * (`generated/*.metadata.ts`: `inputs`/`outputs` декоратора, поля `declare` с
 * `TInputValue` и геттеры с `TOutputEmitter`), и компонент наследует его, а не
 * базу напрямую: строгий шаблон потребителя читает выход как свойство класса, а
 * значение входа сверяет с его полем.
 */

import {
	Directive,
	ElementRef,
	EventEmitter,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges,
	TemplateRef,
	computed,
	contentChildren,
	effect,
	inject,
	runInInjectionContext,
	signal,
	viewChild,
	type Signal,
} from '@angular/core'
import type { IEntity } from '@soldy-ui/core'
import type { TInstanceState, TStateSnapshot } from '@soldy-ui/setup'
import {
	applyAttributes,
	applyClasses,
	applyStyles,
	attributesOf,
	classesOf,
	stylesOf,
	type TAppliedAttributes,
	type TAppliedClasses,
	type TAppliedStyles,
} from './root-attributes'
import { SlotDirective } from './slot.directive'
import { teleportRoot } from './teleport'
import type { TBinding } from './useAdapter'

/**
 * Описание корня компонента — элемента, который описывает ядро (тег, классы,
 * наборы, стиль) и который связан с TElementPlugin. Второй параметр
 * конструктора базы.
 *
 * `strategy` — где корень:
 *
 * - `'host'` — корень — сам хост: элемент, на котором потребитель написал
 *   селектор (`<button so-button>`). Живёт всё время жизни компонента, поэтому
 *   привязка разовая, через инжектированный `ElementRef`;
 * - `'view'` — корень в шаблоне компонента, помечен `#root` и может
 *   пересоздаваться: сигнальный `viewChild('root')` переустанавливает связь
 *   при каждом пересоздании узла. Так устроен компонент, чей корень не может
 *   быть элементом потребителя, — например поле, у которого атрибуты
 *   потребителя делятся между корнем и вложенным `<input>`. Шаблон без
 *   `#root` — компонент без корня (`so-component`).
 *
 * Корню-хосту база раскладывает ещё стиль и скрытие, и у него три настройки:
 *
 * - `style` — имя стиль-выхода компонента в состоянии: стиль, который считает
 *   ядро (`fractionStyle` у ProgressSpinner). Имя у каждого компонента своё,
 *   поэтому его называет компонент, как наборы ядра во Vue называет разметка.
 *   Нет — своего стиля у компонента нет, и на корне только выход плагина
 *   раскладки;
 * - `hides` — прячут ли `visible` и `rendered` корень, по умолчанию да. У
 *   Skeleton нет: они убирают только заглушку, а содержимое в корне остаётся
 *   на виду;
 * - `teleport` — корень уезжает в слой: имена выходов состояния с селектором
 *   цели и с признаком «на месте» (`{ target: 'target', contained: 'contained' }`
 *   у Frame), их называет компонент. Переносит корень `teleportRoot`
 *   (`teleport.ts`) — сам элемент потребителя. Пока корень не в цели и не на
 *   месте — на сервере, до переноса, без цели, — база его прячет. Нет —
 *   корень стоит, где его написали.
 */
export type TRootSpec =
	| { readonly strategy: 'view' }
	| {
			readonly strategy: 'host'
			readonly style?: string
			readonly hides?: boolean
			readonly teleport?: TRootTeleport
	  }

/** Слой в описании корня (`TRootSpec.teleport`): имена выходов состояния. */
export type TRootTeleport = {
	/** Выход с селектором цели: `target` у Frame. */
	readonly target: string
	/** Выход «корень на месте, без переноса»: `contained` у Frame. */
	readonly contained: string
}

/** Где корень компонента — см. `TRootSpec`. */
export type TRootStrategy = TRootSpec['strategy']

/** Корня-хоста нет: корень в шаблоне или его нет вовсе. */
const VIEW_ROOT: TRootSpec = { strategy: 'view' }

/** Корень, который в слой не уезжает, всегда на своём месте. */
const IN_PLACE = (): boolean => true

/** Наборы ядра, которые база раскладывает на корень-хост. */
const ROOT_SETS = ['aria', 'attrs', 'dataset'] as const

@Directive({
	standalone: true,
	host: {
		'[style.display]': '_rootDisplay()',
	},
})
export abstract class TComponentBase<TInstance extends IEntity>
	implements OnInit, OnChanges, OnDestroy
{
	/** Готовый core-инстанс (если не передан, создаётся из ctor дескриптора). */
	@Input() ctrl?: TInstance

	protected abstract createBinding(
		ctrl: TInstance | undefined,
		inputs: object,
	): TBinding<TInstance>

	private readonly _inputNames: readonly string[]

	/**
	 * Хост-элемент, если корень — он (стратегия `'host'`), иначе `null`. Поле:
	 * по нему же работает привязка хоста, у корня в шаблоне она пуста.
	 */
	private readonly _host: Element | null

	/** Прячет ли видимость корень-хост (`TRootSpec.hides`); у корня в шаблоне — нет. */
	private readonly _hides: boolean

	/**
	 * Корень там, где ему место: у слоя (`TRootSpec.teleport`) — в цели или на
	 * месте, если так задано (`teleportRoot`); у остальных — всегда.
	 */
	private readonly _placed: () => boolean

	private readonly _binding = signal<TBinding<TInstance> | undefined>(undefined)
	private _eventsCleanup?: () => void

	/**
	 * Инжектор компонента. В его контексте `createOutput` заводит эмиттер, а
	 * `ngOnInit` собирает компонент. Эмиттер берёт из контекста `DestroyRef`
	 * компонента, и `outputToObservable` по выходу завершается вместе с
	 * компонентом, как у эмиттера, заведённого в конструкторе; сборка — локаль
	 * ближайшего провайдера. Первое чтение выхода идёт уже вне контекста — из
	 * шаблона потребителя или кода, — и `ngOnInit` тоже.
	 */
	private readonly _injector = inject(Injector)

	/** Состояние Core. Сигнал, т.к. binding появляется только в ngOnInit. */
	readonly state = computed<TInstanceState<TInstance>>(() => this._binding()?.state() ?? {})

	/**
	 * Скрытие корня-хоста — привязка `[style.display]` декоратора: прячут и
	 * `visible`, и `rendered`. У корня в шаблоне и у корня, который видимость
	 * не прячет (`hides: false`), хосту не достаётся ничего. Слой прячется ещё
	 * и не на своём месте — на сервере, до переноса в цель, без цели
	 * (`_placed`).
	 *
	 * Инстанса компонента база не знает (у `so-component` нет ни классов, ни
	 * наборов), поэтому состояние читает по именам — как запись
	 * `имя → значение` — и вид значения проверяет на месте.
	 */
	protected readonly _rootDisplay = computed(() => {
		const state: TStateSnapshot = this.state()
		const hidden = this._hides && (state['rendered'] === false || state['visible'] === false)

		return hidden || !this._placed() ? 'none' : null
	})

	/**
	 * Корень шаблона, помеченный `#root`. Читает его только стратегия `'view'`
	 * (см. `_bindView`): у `'host'` корень — сам хост, и `#root` в шаблоне нет.
	 *
	 * Сигнальный viewChild(), а не @ViewChild: обычный запрос читается
	 * один раз в ngAfterViewInit и после пересоздания узла указывает на
	 * мёртвый элемент.
	 *
	 * Поле, а не вызов в `_bindView`: сигнальные запросы компилятор Angular
	 * распознаёт только в инициализаторе поля, вызов в методе роняет AOT с
	 * NG8110. Поле инициализируется до тела конструктора, откуда зовётся
	 * `_bindView`.
	 *
	 * Параметры заданы явно: первый — тип локатора, здесь строка, второй —
	 * то, что отдаёт `read`. Без него `nativeElement` был бы `any`, и
	 * несовпадение с узлом `TElementPlugin` не было бы видно.
	 */
	private readonly _root = viewChild<unknown, ElementRef<Element>>('root', { read: ElementRef })

	/** Объявленные потребителем `<ng-template slot="...">`. */
	private readonly _slots = contentChildren(SlotDirective)

	/**
	 * Шаблон scoped-слота по имени из контракта.
	 *
	 * Сигнальный запрос, а не @ContentChildren: результат читается прямо из
	 * шаблона, и обычный запрос не уведомил бы об изменении.
	 */
	protected slot(name: string): TemplateRef<unknown> | null {
		return this._slots().find((slot) => slot.name === name)?.template ?? null
	}

	constructor(inputNames: readonly string[], root: TRootSpec = VIEW_ROOT) {
		this._inputNames = inputNames

		if (root.strategy === 'host') {
			// `ElementRef<Element>`, а не `any` по умолчанию: узел `TElementPlugin` —
			// `Element`, и без явного параметра несовпадение типов здесь не видно.
			const host = inject<ElementRef<Element>>(ElementRef).nativeElement

			this._host = host
			this._hides = root.hides ?? true
			this._placed = root.teleport ? this._teleportHost(host, root.teleport) : IN_PLACE
			this._bindHost(host, root.style)
		} else {
			this._host = null
			this._hides = false
			this._placed = IN_PLACE
			this._bindView()
		}
	}

	ngOnInit(): void {
		// Первый ngOnChanges пришёл раньше связки и ничего не записал: заданные
		// при монтировании входы применяет сборка контекста
		const inputs = this.collectInputs()

		// Тег корня-хоста — у самого элемента: входа `tag` нет (`useInputs`)
		if (this._host) inputs['tag'] = this._host.localName

		// Сборка — в контексте инъекции компонента: локаль поддерева обёртка
		// сборки берёт у ближайшего провайдера (`createAngularAdapterContext`)
		const binding = runInInjectionContext(this._injector, () =>
			this.createBinding(this.ctrl, inputs),
		)

		this._eventsCleanup = binding.syncEvents((name) => this._createdOutput(name))

		this._binding.set(binding)
	}

	ngOnChanges(changes: SimpleChanges): void {
		const binding = this._binding()

		if (!binding) return

		const inputs: Record<string, unknown> = {}

		for (const key of Object.keys(changes)) {
			inputs[key] = changes[key].currentValue
		}

		binding.syncInputs(inputs)
	}

	ngOnDestroy(): void {
		this._eventsCleanup?.()
		this._binding()?.destroy()
	}

	protected collectInputs(): Record<string, unknown> {
		const inputs: Record<string, unknown> = {}

		for (const name of this._inputNames) {
			const value: unknown = Reflect.get(this, name)
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	/**
	 * Заводит эмиттер выхода `name` — его зовёт геттер выхода из
	 * `T<Имя>Surface` при первом чтении. Эмиттер становится собственным
	 * свойством экземпляра под именем выхода и заслоняет геттер прототипа:
	 * следующие чтения отдают его без вызова, а приёмник событий находит его по
	 * имени (`_createdOutput`). Хранилище одно — само свойство.
	 *
	 * Свойство только для чтения, как поле выхода в типе: повторный вызов по
	 * тому же имени — ошибка, а не подмена эмиттера, на который уже подписаны.
	 */
	protected createOutput<T>(name: string): EventEmitter<T> {
		const emitter = runInInjectionContext(this._injector, () => new EventEmitter<T>())

		Object.defineProperty(this, name, { value: emitter, enumerable: true })

		return emitter
	}

	/**
	 * Корень — сам хост (`'host'`). Элемент потребителя живёт всё время жизни
	 * компонента: привязка к TElementPlugin разовая, а классы, наборы и стиль
	 * ядра база раскладывает на него сама — шаблона на хост нет. Зовётся из
	 * конструктора: эффектам нужен injection context.
	 *
	 * `styleName` — имя стиль-выхода компонента в состоянии (`TRootSpec.style`).
	 */
	private _bindHost(host: Element, styleName: string | undefined): void {
		// Атрибут с именем входа — запись входа, а не атрибут корня (см. шапку)
		for (const name of ['ctrl', ...this._inputNames]) host.removeAttribute(name)

		effect(() => this._binding()?.bindElement(host))

		// Эффект на классы, на каждый набор и на стиль: перекладывается только
		// сменившееся, и память «что поставила база» у каждого своя
		const classes = computed(() => {
			const state: TStateSnapshot = this.state()

			return classesOf(state['classes'])
		})

		let appliedClasses: TAppliedClasses = new Set()

		effect(() => {
			appliedClasses = applyClasses(host, classes(), appliedClasses)
		})

		for (const name of ROOT_SETS) {
			const set = computed(() => {
				const state: TStateSnapshot = this.state()

				return attributesOf(state[name])
			})

			let applied: TAppliedAttributes = new Map()

			effect(() => {
				applied = applyAttributes(host, set(), applied)
			})
		}

		// Слои стиля — значения состояния как есть: связка заменяет их только
		// на смену содержимого, и эффект не будит смена чужих свойств
		const layout = computed(() => {
			const state: TStateSnapshot = this.state()

			return state['layout_styles']
		})
		const own = computed(() => {
			const state: TStateSnapshot = this.state()

			return styleName === undefined ? undefined : state[styleName]
		})

		let appliedStyles: TAppliedStyles = new Map()

		// Снизу выход плагина раскладки, поверх — стиль-выход компонента
		effect(() => {
			appliedStyles = applyStyles(host, stylesOf(layout(), own()), appliedStyles)
		})
	}

	/**
	 * Слой (`TRootSpec.teleport`): корень-хост уезжает в цель. Цель и «на
	 * месте» база читает из состояния по именам выходов, которые назвал
	 * компонент, а переносит корень `teleportRoot`. Зовётся из конструктора:
	 * эффекту после отрисовки нужен injection context.
	 *
	 * Отдаёт сигнал «корень на своём месте» — по нему корень прячет скрытие.
	 */
	private _teleportHost(host: Element, names: TRootTeleport): Signal<boolean> {
		return teleportRoot(host, {
			// Селектор — непустая строка, всё остальное — цели нет
			target: computed(() => {
				const state: TStateSnapshot = this.state()
				const value = state[names.target]

				return typeof value === 'string' && value !== '' ? value : null
			}),
			contained: computed(() => {
				const state: TStateSnapshot = this.state()

				return state[names.contained] === true
			}),
		})
	}

	/**
	 * Корень в шаблоне (`'view'`): существует не всегда и может пересоздаваться,
	 * поэтому эффект перечитывает `#root` и переустанавливает связь. Зовётся из
	 * конструктора: эффекту нужен injection context.
	 */
	private _bindView(): void {
		effect(() => {
			const binding = this._binding()
			const ref = this._root()

			if (!binding) return

			binding.bindElement(ref?.nativeElement ?? null)
		})
	}

	/**
	 * Эмиттер выхода `name`, если его уже завёл `createOutput`, — иначе ничего.
	 * Читает собственное свойство, а не через геттер: поиск эмиттер не заводит.
	 */
	private _createdOutput(name: string): EventEmitter<unknown> | undefined {
		const output: unknown = Object.getOwnPropertyDescriptor(this, name)?.value

		return output instanceof EventEmitter ? output : undefined
	}
}
