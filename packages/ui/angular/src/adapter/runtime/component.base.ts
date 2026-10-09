/**
 * TComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: связывает корневой DOM-элемент с TElementPlugin (см. `_bindRoot`)
 * - state: сигнал состояния Core (шаблон подписывается сам, без ChangeDetectorRef)
 * - ngOnInit: создаёт binding (createBinding) из заданных inputs
 *   и ставит приёмник событий ядра для выходов (syncEvents)
 * - ngOnChanges: пробрасывает изменённые inputs в Core (syncInputs)
 * - ngOnDestroy: очищает подписки и adapter.destroy()
 *
 * Подкласс обязан реализовать:
 * - createBinding(ctrl, inputs): создаёт TBinding через setup-функцию
 * - super(inputNames, rootStrategy?) в конструкторе: имена входов и стратегия
 *   привязки корня — `'view'` (по умолчанию), когда корень живёт внутри
 *   `@if`/`@else` и шаблон помечает его `#root`, или `'host'`, когда корень —
 *   сам хост-элемент компонента.
 *
 * Стратегия передаётся через конструктор (а не getter), т.к. она нужна уже в
 * конструкторе (`_bindRoot`), а TS запрещает обращение к абстрактному свойству
 * в конструкторе; имена входов — тем же вызовом.
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
import type { IEntity, TAttributesMap } from '@soldy-ui/core'
import type { TInstanceState } from '@soldy-ui/setup'
import { applyAttributes } from './aria.directive'
import { SlotDirective } from './slot.directive'
import type { TBinding } from './useAdapter'

/**
 * Стратегия привязки корневого DOM-элемента к TElementPlugin.
 *
 * - `'view'` — корень существует не всегда (живёт внутри `@if`, может
 *   пересоздаваться при смене `tag`): сигнальный `viewChild('root')`
 *   переустанавливает связь при каждой пересоздании узла.
 * - `'host'` — корень существует всё время жизни компонента: привязка
 *   разовая, через инжектированный `ElementRef` хоста.
 */
export type TRootStrategy = 'view' | 'host'

@Directive({ standalone: true })
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
	 * Корень шаблона, помеченный `#root`. Читает его только стратегия `'view'`
	 * (см. `_bindRoot`): у `'host'` корень — сам хост, и `#root` в шаблоне нет.
	 *
	 * Сигнальный viewChild(), а не @ViewChild: обычный запрос читается
	 * один раз в ngAfterViewInit и после пересоздания узла (смена `tag`,
	 * переключение `rendered`) указывает на мёртвый элемент.
	 *
	 * Поле, а не вызов в `_bindRoot`: сигнальные запросы компилятор Angular
	 * распознаёт только в инициализаторе поля, вызов в методе роняет AOT с
	 * NG8110. Поле инициализируется до тела конструктора, откуда зовётся
	 * `_bindRoot`.
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

		this._bindRoot(rootStrategy)
	}

	ngOnInit(): void {
		// Первый ngOnChanges пришёл раньше связки и ничего не записал: заданные
		// при монтировании входы применяет сборка контекста
		const binding = this.createBinding(this.ctrl, this.collectInputs())

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
	 * Связывает корневой DOM-элемент с TElementPlugin по выбранной стратегии.
	 * Вызывается из конструктора — обеим стратегиям нужен injection context.
	 */
	private _bindRoot(strategy: TRootStrategy): void {
		if (strategy === 'host') {
			// `ElementRef<Element>`, а не `any` по умолчанию: узел `TElementPlugin` —
			// `Element`, и без явного параметра несовпадение типов здесь не видно.
			const elementRef = inject<ElementRef<Element>>(ElementRef)

			let appliedAria: string[] = []
			let appliedAttrs: string[] = []
			let appliedDataset: string[] = []

			effect(() => {
				this._binding()?.bindElement(elementRef.nativeElement)

				// Хост существует всё время жизни компонента, шаблона на него нет
				// (в отличие от Button, где эти же наборы раскладывает `[ariaAttrs]`
				// в разметке) — поэтому три набора ядра применяются здесь тем же
				// алгоритмом, что и в `AriaDirective`.
				const state = this.state() as Record<string, TAttributesMap | undefined>

				appliedAria = applyAttributes(elementRef.nativeElement, state['aria'], appliedAria)
				appliedAttrs = applyAttributes(
					elementRef.nativeElement,
					state['attrs'],
					appliedAttrs,
				)
				appliedDataset = applyAttributes(
					elementRef.nativeElement,
					state['dataset'],
					appliedDataset,
				)
			})

			return
		}

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
