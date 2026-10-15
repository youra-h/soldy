/**
 * TComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: связывает корень компонента с TElementPlugin по описанию
 *   корня (`TRootSpec`), у корня-хоста ещё снимает с элемента атрибуты-входы.
 *   Узел плагинам база отдаёт эффектом после отрисовки (`afterRenderEffect`),
 *   то есть только в браузере, как остальные адаптеры, у которых на сервере
 *   ни рефы, ни attachment-ы не зовутся: узел эмуляции DOM сервера плагинам
 *   мерить и слушать незачем, а без `requestAnimationFrame` в Node
 *   `TElementPlugin` его и не объявил бы. Классы, наборы и стиль ядра — обычные
 *   эффекты: они нужны и разметке сервера
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
 * - классы ядра и наборы `aria`, `attrs`, `dataset` — эффекты базы
 *   (`root-attributes.ts`). Всё, что называет ядро, база считает своим всегда,
 *   как привязку хоста `[attr.x]` или `[class.x]`, и пишет поверх того, что
 *   стоит на элементе, — статики потребителя, разметки сервера после
 *   гидратации; чего ядро не называет, не трогает. Какие наборы ложатся на
 *   корень, задаёт описание корня (`sets`): у поля `aria` стоит на вложенном
 *   `<input>`. Набор, который на корень кладёт разметка владельца
 *   (`AttributesDirective` на вложенной кнопке), главнее наборов корня: оба
 *   пишут через один раскладчик элемента (`TElementAttributes`). Классы — не
 *   привязка хоста `[class]`: статику шаблона потребителя Angular сверяет
 *   только у первой привязки директивы к классам или стилям
 *   (`directiveStylingLast` у узла одно на те и другие), а `[class]`
 *   компилятор ставит раньше `[style.*]`. С ней статический
 *   `style="display: …"` потребителя проигрывал бы скрытию, а у видимого
 *   корня снимался бы вовсе. `class`, `[class.x]` и `[ngClass]` потребителя
 *   ставят и снимают только свои имена;
 * - стиль — тоже эффект базы, по свойствам и тем же правилом: снизу выход
 *   плагина раскладки (`layout_styles`), поверх него стиль-выход компонента
 *   (`fractionStyle` у ProgressSpinner) и место элемента коллекции (`order`
 *   фасада, `TRootSpec.order`): ряд коллекции — флексбокс, и элемент встаёт по
 *   номеру в коллекции, а не по месту в разметке, как у Vue и Svelte.
 *   Свойства, которых ядро не называет, — потребителя или плагина,
 *   записавшего его в узел сам, — база не трогает. Не привязка хоста
 *   `[style]` — по той же причине, что классы:
 *   она стала бы первой привязкой стилей директивы. `[style.display]` скрытия
 *   остаётся привязкой;
 * - `rendered=false` прячет корень, как `visible=false`: убрать элемент
 *   потребителя компонент не может. Содержимое остаётся, `TElementPlugin`
 *   связан с хостом всё время. Так же корень прячет выход, который называет
 *   описание корня (`TRootSpec.shownBy` — `active` у панели таба), пока он не
 *   `true`;
 * - слой (`TRootSpec.teleport` — Frame) есть только в браузере, как оверлей
 *   CDK: элемент потребителя, со всем, что на нём написано, переносит в цель
 *   `teleportRoot` (`teleport.ts`) после отрисовки. Пока корень не в цели и не
 *   на месте — на сервере, до переноса, без цели, — слоя нет (`placed`): база
 *   корень прячет и классов, наборов и стиля ядра на нём не рисует;
 * - у поля (`TRootSpec.control` — Input, CheckBox, Switch, радио) атрибуты
 *   потребителя делятся между корнем и вложенным `<input>` (`#control` в
 *   шаблоне), как у Vue и React, а у элемента коллекции (ListBox, Tabs,
 *   Accordion) — между корнем и строкой: статические атрибуты, которые
 *   потребитель записал на компонент в разметке, кроме `class`, `style`,
 *   входов и меток soldy (`so-*` — селектор радио), база переносит с корня на
 *   `#control`. Привязки `[attr.x]` и слушатели
 *   потребителя остаются на корне: их Angular ставит на элемент, который
 *   написан в разметке, и перенести их нечем. Всплывающие события поля
 *   (`input`, `keydown`) доходят до корня сами, а `focus` и `blur` не
 *   всплывают — слушатель на корне их не получит.
 *
 * Сборка (`createBinding`) идёт в контексте инъекции компонента
 * (`runInInjectionContext`): обёртка сборки
 * (`createAngularAdapterContext`) берёт из него локаль ближайшего
 * `LocaleProviderDirective`, а лифт коллекции (`TAngularElevator`) — слой
 * владельца. Сам `ngOnInit` в контексте не выполняется.
 *
 * У коллекционного компонента — владельца коллекции, её элемента, панели таба
 * — контекстов два, свой и фасада, и `createBinding` отдаёт их одной связкой
 * (`joinBindings`). Второй параметр типа базы — фасад: его свойства шаблон
 * читает из того же `state()`, а сам фасад база отдаёт шаблону сигналом
 * `facade()`, как инстанс — `instance()`.
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
	HostAttributeToken,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges,
	TemplateRef,
	afterRenderEffect,
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
import type { TStateSnapshot } from '@soldy-ui/setup'
import {
	TElementAttributes,
	applyClasses,
	applyStyles,
	attributesOf,
	classesOf,
	orderOf,
	stylesOf,
	type TAppliedClasses,
	type TAppliedStyles,
} from './root-attributes'
import { SlotDirective } from './slot.directive'
import { teleportRoot } from './teleport'
import type { TBinding, TBindingState } from './useAdapter'

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
 * - `order` — корень встаёт по месту в коллекции: `order` фасада элемента
 *   уходит в стиль корня поверх стиль-выхода. У элементов ListBox, Tabs и
 *   Accordion да — их ряд флексбокс; у радио нет: радио одной группы стоят
 *   где угодно, хоть в строках чужого списка, и номер увёл бы радио по
 *   чужому флекс-ряду, — как у Vue и Svelte;
 * - `shownBy` — выход состояния, без которого корень скрыт: пока он не
 *   `true`, корень прячется, как при `visible=false`. У панели таба это
 *   `active` фасада — панель видна, только пока активен её таб. Имя выхода
 *   называет компонент, как имена выходов слоя. Нет — корень прячут только
 *   `visible` и `rendered`;
 * - `teleport` — корень уезжает в слой: имена выходов состояния с селектором
 *   цели и с признаком «на месте» (`{ target: 'target', contained: 'contained' }`
 *   у Frame), их называет компонент. Переносит корень `teleportRoot`
 *   (`teleport.ts`) — сам элемент потребителя. Пока корень не в цели и не на
 *   месте — на сервере, до переноса, без цели, — слоя нет (`placed`). Нет —
 *   корень стоит, где его написали;
 * - `sets` — наборы ядра, которые база кладёт на корень, по умолчанию все три.
 *   У поля — только `attrs`: его `aria` стоит на вложенном `<input>`
 *   (`AttributesDirective` в шаблоне), а `dataset` разметка поля не выводит,
 *   как и у остальных адаптеров;
 * - `control` — у корня есть вложенное поле, элемент шаблона `#control`
 *   (`<input>` у Input, CheckBox, Switch и радио, строка — у элемента
 *   коллекции), и статические атрибуты, которые потребитель записал на
 *   компонент, кроме `class`, `style`, входов и меток soldy (`so-*`),
 *   переезжают на него.
 */
export type TRootSpec =
	| { readonly strategy: 'view' }
	| {
			readonly strategy: 'host'
			readonly style?: string
			readonly hides?: boolean
			readonly order?: boolean
			readonly shownBy?: string
			readonly teleport?: TRootTeleport
			readonly sets?: readonly TRootSet[]
			readonly control?: boolean
	  }

/** Описание корня-хоста — элемента потребителя (`TRootSpec` со стратегией `'host'`). */
type TRootHost = Extract<TRootSpec, { readonly strategy: 'host' }>

/** Набор ядра, который база может положить на корень-хост (`TRootSpec.sets`). */
export type TRootSet = 'attrs' | 'aria' | 'dataset'

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
const IN_PLACE: Signal<boolean> = signal(true).asReadonly()

/** Пустое состояние — его база рисует на корне слоя, которого нет. */
const NO_STATE: TStateSnapshot = Object.freeze({})

/** Наборы ядра, которые база раскладывает на корень-хост, если описание корня не сузило. */
const ROOT_SETS: readonly TRootSet[] = ['attrs', 'aria', 'dataset']

/**
 * Атрибуты корня, которые не переезжают на вложенное поле (`TRootSpec.control`):
 * класс и стиль — вид корня, как у `useSplitAttrs` Vue, и `ng-version` —
 * пометка Angular на корневом компоненте приложения. Её Angular записывает в
 * разметку хоста сам, и для `HostAttributeToken` она выглядит атрибутом из
 * разметки, хотя потребитель её не писал: поле бывает и корневым компонентом —
 * созданным `createComponent` или `TestBed`.
 */
const ROOT_ATTRIBUTES: ReadonlySet<string> = new Set(['class', 'style', 'ng-version'])

/**
 * Метки soldy — атрибуты с префиксом `so-`: селектор компонента
 * (`<label so-radio-group-item>`) и директивы адаптера. Они метят элемент для
 * Angular, полю они ни к чему, и на поле не переезжают: у радио селектор
 * атрибутный, а атрибуты потребителя делятся, как у поля.
 */
const MARKER_PREFIX = 'so-'

@Directive({
	standalone: true,
	host: {
		'[style.display]': '_rootDisplay()',
	},
})
export abstract class TComponentBase<TInstance extends IEntity, TFacade = unknown>
	implements OnInit, OnChanges, OnDestroy
{
	/** Готовый core-инстанс (если не передан, создаётся из ctor дескриптора). */
	@Input() ctrl?: TInstance

	protected abstract createBinding(
		ctrl: TInstance | undefined,
		inputs: object,
	): TBinding<TInstance, TFacade>

	private readonly _inputNames: readonly string[]

	/**
	 * Хост-элемент, если корень — он (стратегия `'host'`), иначе `null`. Поле:
	 * по нему же работает привязка хоста, у корня в шаблоне она пуста.
	 */
	private readonly _host: Element | null

	/** Прячет ли видимость корень-хост (`TRootSpec.hides`); у корня в шаблоне — нет. */
	private readonly _hides: boolean

	/** Выход, без которого корень-хост скрыт (`TRootSpec.shownBy`); нет — не прячет. */
	private readonly _shownBy: string | undefined

	/**
	 * Корень там, где ему место: у слоя (`TRootSpec.teleport`) — в цели или,
	 * если так задано, на месте, и только в браузере, после отрисовки
	 * (`teleportRoot`); у остальных — всегда. Пока слой не на своём месте — на
	 * сервере, до переноса, без цели, — его нет: база корень прячет и ничего от
	 * ядра на нём не рисует, а шаблон слоя по этому же сигналу не рисует
	 * содержимое (`@if (placed())` у Frame).
	 */
	protected readonly placed: Signal<boolean>

	private readonly _binding = signal<TBinding<TInstance, TFacade> | undefined>(undefined)
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

	/**
	 * Состояние Core — у коллекционного компонента вместе со свойствами фасада.
	 * Сигнал, т.к. binding появляется только в ngOnInit.
	 */
	readonly state = computed<TBindingState<TInstance, TFacade>>(
		() => this._binding()?.state() ?? {},
	)

	/**
	 * Инстанс ядра — внешний `ctrl` или собранный в `ngOnInit`; до сборки его
	 * нет. Шаблон отдаёт его в scope слотов (`{ ctrl }` у Input и Switch) и
	 * зовёт его команды (`clear` кнопки очистки), как `ctrl` в шаблоне Vue.
	 */
	protected readonly instance = computed<TInstance | undefined>(() => this._binding()?.ctrl)

	/**
	 * Фасад коллекции — у компонента с двумя контекстами; до сборки и у
	 * остальных его нет. Через его контекст шаблон элемента зовёт команды
	 * коллекции: выбрать (`choose`), раскрыть (`toggle`), активировать, закрыть
	 * таб, — как `context` в шаблоне Vue.
	 */
	protected readonly facade = computed<TFacade | undefined>(() => this._binding()?.facade)

	/**
	 * Состояние, которое база рисует на корне-хосте: классы, наборы, стиль. У
	 * слоя не на своём месте оно пустое: такого слоя нет, и на элементе
	 * потребителя остаётся только написанное им самим (`placed`).
	 */
	private readonly _drawn = computed<TStateSnapshot>(() =>
		this.placed() ? this.state() : NO_STATE,
	)

	/**
	 * Скрытие корня-хоста — привязка `[style.display]` декоратора: прячут и
	 * `visible`, и `rendered`. У корня в шаблоне и у корня, который видимость
	 * не прячет (`hides: false`), хосту не достаётся ничего. Слой прячется ещё
	 * и не на своём месте — на сервере, до переноса в цель, без цели
	 * (`placed`): от элемента потребителя остаётся пустой скрытый узел.
	 *
	 * Инстанса компонента база не знает (у `so-component` нет ни классов, ни
	 * наборов), поэтому состояние читает по именам — как запись
	 * `имя → значение` — и вид значения проверяет на месте.
	 */
	protected readonly _rootDisplay = computed(() => {
		const state: TStateSnapshot = this.state()
		const hidden = this._hides && (state['rendered'] === false || state['visible'] === false)
		// Выход, без которого корня нет: у панели таба — активен ли её таб
		const absent = this._shownBy !== undefined && state[this._shownBy] !== true

		return hidden || absent || !this.placed() ? 'none' : null
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

	/**
	 * Вложенное поле, помеченное `#control`, — у корня-хоста поля
	 * (`TRootSpec.control`): на него переезжают статические атрибуты
	 * потребителя (см. `_moveToControl`). Сигнальный запрос и поле — по тем же
	 * причинам, что `_root`.
	 */
	private readonly _control = viewChild<unknown, ElementRef<Element>>('control', {
		read: ElementRef,
	})

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
			this._shownBy = root.shownBy
			this.placed = root.teleport ? this._teleportHost(host, root.teleport) : IN_PLACE
			this._bindHost(host, root)

			if (root.control) this._moveToControl(host)
		} else {
			this._host = null
			this._hides = false
			this._shownBy = undefined
			this.placed = IN_PLACE
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
	 * компонента: привязка к TElementPlugin разовая и только в браузере, после
	 * отрисовки, а классы, наборы и стиль ядра база раскладывает на него сама —
	 * шаблона на хост нет. Зовётся из конструктора: эффектам нужен injection
	 * context.
	 *
	 * Из описания корня здесь — имя стиль-выхода компонента (`style`), место в
	 * коллекции (`order`) и наборы ядра на корне (`sets`).
	 */
	private _bindHost(host: Element, root: TRootHost): void {
		const styleName = root.style

		// Атрибут с именем входа — запись входа, а не атрибут корня (см. шапку)
		for (const name of ['ctrl', ...this._inputNames]) host.removeAttribute(name)

		// Узел — плагинам только в браузере: на сервере эффекта после отрисовки нет
		afterRenderEffect(() => this._binding()?.bindElement(host))

		// Эффект на классы, на каждый набор и на стиль: перекладывается только
		// сменившееся. Память начинается пустой и на гидратации: первая
		// раскладка в браузере пишет всё, что называет ядро, поверх
		// напечатанного сервером
		const classes = computed(() => classesOf(this._drawn()['classes']))

		let appliedClasses: TAppliedClasses = new Set()

		effect(() => {
			appliedClasses = applyClasses(host, classes(), appliedClasses)
		})

		// Наборы — слоями раскладчика элемента: на корень вложенного компонента
		// свой набор поверх кладёт ещё и разметка владельца (`AttributesDirective`)
		const attributes = TElementAttributes.of(host)

		for (const name of root.sets ?? ROOT_SETS) {
			const set = computed(() => attributesOf(this._drawn()[name]))

			effect(() => attributes.set(name, set()))
		}

		// Слои стиля — значения состояния как есть: связка заменяет их только
		// на смену содержимого, и эффект не будит смена чужих свойств
		const layout = computed(() => this._drawn()['layout_styles'])
		const own = computed(() => (styleName === undefined ? undefined : this._drawn()[styleName]))
		const order = computed(() => (root.order ? this._drawn()['order'] : undefined))

		let appliedStyles: TAppliedStyles = new Map()

		// Снизу выход плагина раскладки, поверх — стиль-выход компонента и место
		// элемента коллекции, если корень стоит по нему
		effect(() => {
			appliedStyles = applyStyles(
				host,
				stylesOf(layout(), own(), orderOf(order())),
				appliedStyles,
			)
		})
	}

	/**
	 * Поле (`TRootSpec.control`): статические атрибуты, которые потребитель
	 * записал на компонент, переезжают с корня на вложенное поле `#control`, как
	 * атрибуты снаружи у Vue и React. На корне остаются класс и стиль — вид
	 * корня, — пометки Angular (`ROOT_ATTRIBUTES`) и метки soldy с префиксом
	 * `so-` — селектор радио (`<label so-radio-group-item>`) и директивы
	 * адаптера; атрибуты-входы база уже сняла (`_bindHost`).
	 *
	 * Чей атрибут, база узнаёт не по узлу, а по скомпилированной разметке
	 * потребителя (`HostAttributeToken`): на узле стоит и то, чего потребитель
	 * не писал, — атрибут инкапсуляции стилей его компонента (`_ngcontent-*`),
	 * а при гидратации — всё, что напечатал сервер, с наборами ядра и пометкой
	 * гидратации (`ngh`) вместе. Статические атрибуты разметки Angular при
	 * гидратации ставит на узел сервера заново, и база переносит их так же — на
	 * поле из разметки сервера, где они уже стоят.
	 *
	 * На поле их ставит эффект, когда узел шаблона есть, — раньше, чем шаблон
	 * поля положит на него набор ядра (`AttributesDirective`): эффекты базы
	 * идут в проходе представления, где написан компонент, до его собственного
	 * шаблона. Поэтому имя, которое называет ядро, остаётся за ядром, как на
	 * корне. Зовётся из конструктора: `HostAttributeToken` разрешается только
	 * там, а эффекту нужен injection context.
	 */
	private _moveToControl(host: Element): void {
		const moved = new Map<string, string>()

		for (const name of host.getAttributeNames()) {
			if (ROOT_ATTRIBUTES.has(name) || name.startsWith(MARKER_PREFIX)) continue

			const value = inject(new HostAttributeToken(name), { optional: true })

			// Атрибута нет в разметке потребителя — его поставил не он
			if (value === null) continue

			moved.set(name, value)
			host.removeAttribute(name)
		}

		if (moved.size === 0) return

		effect(() => {
			const control = this._control()?.nativeElement

			if (!control) return

			for (const [name, value] of moved) control.setAttribute(name, value)
		})
	}

	/**
	 * Слой (`TRootSpec.teleport`): корень-хост уезжает в цель. Цель и «на
	 * месте» база читает из состояния по именам выходов, которые назвал
	 * компонент, а переносит корень `teleportRoot`. Зовётся из конструктора:
	 * эффекту после отрисовки нужен injection context.
	 *
	 * Отдаёт сигнал «корень на своём месте» (`placed`): пока он ложь, слоя нет.
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
	 * поэтому эффект перечитывает `#root` и переустанавливает связь — после
	 * отрисовки, только в браузере, как у корня-хоста. Зовётся из конструктора:
	 * эффекту нужен injection context.
	 */
	private _bindView(): void {
		afterRenderEffect(() => {
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
