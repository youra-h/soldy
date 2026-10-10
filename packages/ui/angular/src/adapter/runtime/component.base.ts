/**
 * TComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: связывает корень компонента с TElementPlugin по стратегии
 *   (`TRootStrategy`), у корня-хоста ещё снимает с элемента атрибуты-входы
 * - state: сигнал состояния Core (шаблон подписывается сам, без ChangeDetectorRef)
 * - ngOnInit: создаёт binding (createBinding) из заданных inputs — у корня-хоста
 *   вместе с его тегом — и ставит приёмник событий ядра для выходов (syncEvents)
 * - ngOnChanges: пробрасывает изменённые inputs в Core (syncInputs)
 * - ngOnDestroy: очищает подписки и adapter.destroy()
 *
 * Подкласс обязан реализовать:
 * - createBinding(ctrl, inputs): создаёт TBinding через setup-функцию
 * - super(inputNames, rootStrategy?) в конструкторе: имена входов и стратегия
 *   корня — `'host'`, когда корень — сам элемент потребителя (Button,
 *   ComponentView), или `'view'` (по умолчанию), когда корень живёт в шаблоне.
 *
 * Стратегия передаётся через конструктор (а не getter), т.к. она нужна уже в
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
 *   Angular, а такая запись спорила бы с его привязками;
 * - классы ядра и наборы `aria`, `attrs`, `dataset` — эффекты базы, и
 *   атрибуты и классы потребителя главнее них (`root-attributes.ts`). Классы —
 *   не привязка хоста `[class]`: статику шаблона потребителя Angular сверяет
 *   только у первой привязки директивы к классам или стилям (`directiveStylingLast`
 *   у узла одно на те и другие), а `[class]` компилятор ставит раньше
 *   `[style.*]`. С ней статический `style="display: …"` потребителя проигрывал
 *   бы скрытию, а у видимого корня снимался бы вовсе. `class`, `[class.x]` и
 *   `[ngClass]` потребителя ставят и снимают только свои имена;
 * - `rendered=false` прячет корень, как `visible=false`: убрать элемент
 *   потребителя компонент не может. Содержимое остаётся, `TElementPlugin`
 *   связан с хостом всё время.
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
} from '@angular/core'
import type { IEntity } from '@soldy-ui/core'
import type { TInstanceState, TStateSnapshot } from '@soldy-ui/setup'
import {
	applyAttributes,
	applyClasses,
	attributesOf,
	classesOf,
	type TAppliedAttributes,
	type TAppliedClasses,
} from './root-attributes'
import { SlotDirective } from './slot.directive'
import type { TBinding } from './useAdapter'

/**
 * Где корень компонента — элемент, который описывает ядро (тег, классы,
 * наборы) и который связан с TElementPlugin.
 *
 * - `'host'` — корень — сам хост: элемент, на котором потребитель написал
 *   селектор (`<button so-button>`). Живёт всё время жизни компонента, поэтому
 *   привязка разовая, через инжектированный `ElementRef`.
 * - `'view'` — корень в шаблоне компонента, помечен `#root` и может
 *   пересоздаваться: сигнальный `viewChild('root')` переустанавливает связь
 *   при каждом пересоздании узла. Так устроен компонент, чей корень не может
 *   быть элементом потребителя, — например портал, у которого корень уезжает в
 *   слой. Шаблон без `#root` — компонент без корня (`so-component`).
 */
export type TRootStrategy = 'view' | 'host'

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

	private readonly _binding = signal<TBinding<TInstance> | undefined>(undefined)
	private _eventsCleanup?: () => void

	/**
	 * Инжектор компонента: в его контексте `createOutput` заводит эмиттер.
	 * Эмиттер берёт из контекста `DestroyRef` компонента, и `outputToObservable`
	 * по выходу завершается вместе с компонентом, как у эмиттера, заведённого
	 * в конструкторе. Первое чтение выхода идёт уже вне контекста — из шаблона
	 * потребителя или кода.
	 */
	private readonly _injector = inject(Injector)

	/** Состояние Core. Сигнал, т.к. binding появляется только в ngOnInit. */
	readonly state = computed<TInstanceState<TInstance>>(() => this._binding()?.state() ?? {})

	/**
	 * Скрытие корня-хоста — привязка `[style.display]` декоратора: прячут и
	 * `visible`, и `rendered`. У корня в шаблоне хосту не достаётся ничего.
	 *
	 * Инстанса компонента база не знает (у `so-component` нет ни классов, ни
	 * наборов), поэтому состояние читает по именам — как запись
	 * `имя → значение` — и вид значения проверяет на месте.
	 */
	protected readonly _rootDisplay = computed(() => {
		const state: TStateSnapshot = this.state()

		return this._host && (state['rendered'] === false || state['visible'] === false)
			? 'none'
			: null
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

	constructor(inputNames: readonly string[], rootStrategy: TRootStrategy = 'view') {
		this._inputNames = inputNames

		// `ElementRef<Element>`, а не `any` по умолчанию: узел `TElementPlugin` —
		// `Element`, и без явного параметра несовпадение типов здесь не видно.
		this._host =
			rootStrategy === 'host' ? inject<ElementRef<Element>>(ElementRef).nativeElement : null

		if (this._host) this._bindHost(this._host)
		else this._bindView()
	}

	ngOnInit(): void {
		// Первый ngOnChanges пришёл раньше связки и ничего не записал: заданные
		// при монтировании входы применяет сборка контекста
		const inputs = this.collectInputs()

		// Тег корня-хоста — у самого элемента: входа `tag` нет (`useInputs`)
		if (this._host) inputs['tag'] = this._host.localName

		const binding = this.createBinding(this.ctrl, inputs)

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
	 * компонента: привязка к TElementPlugin разовая, а классы и наборы ядра база
	 * раскладывает на него сама — шаблона на хост нет. Зовётся из конструктора:
	 * эффектам нужен injection context.
	 */
	private _bindHost(host: Element): void {
		// Атрибут с именем входа — запись входа, а не атрибут корня (см. шапку)
		for (const name of ['ctrl', ...this._inputNames]) host.removeAttribute(name)

		effect(() => this._binding()?.bindElement(host))

		// Эффект на классы и на каждый набор: перекладывается только сменившееся,
		// и память «что поставила база» у каждого своя
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
