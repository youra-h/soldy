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
 * - connectedCallback: при первом подключении строит структуру шаблона в
 *   самом элементе и раскладывает по ней свет; при каждом — новая связка над
 *   тем же инстансом, `bindElement(this)` и полная отрисовка. Первое
 *   подключение бывает отложено — см. ниже. Подключение элемента, которого в
 *   документе уже нет (колбэк узла, снятого раньше своей очереди), — пропуск
 * - attributeChangedCallback: приводит атрибут к типу и пишет в Core
 * - disconnectedCallback: снимает подписки и уничтожает adapter-context;
 *   структура, свет и инстанс остаются у элемента. Отключение из переноса,
 *   который делает сама база, — пропуск (см. «Перенос силами базы» ниже)
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
 *                          'inherit' в null, а null снимает атрибут) —
 *                          раскладчиком элемента, нижними его слоями
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
 * стиль-выхода (`fractionStyle` у ProgressSpinner), прячет ли видимость корень
 * (у Skeleton нет — она убирает только заглушку), уезжает ли корень в слой
 * (`teleport` у Frame): тогда база уводит его в цель по селектору (`TTeleport`,
 * `teleport.ts`), а без цели прячет на месте — это третья причина скрытия,
 * рядом с `rendered` и `visible`, — какие наборы ядра лежат на корне (`sets`)
 * и есть ли в корне поле (`control`, см. ниже).
 *
 * Атрибуты, классы и свойства стиля потребителя главнее того, что пишет ядро:
 * по каждому имени база помнит, что поставила сама, своё пишет и снимает, а
 * чужое не трогает — `style.width` потребителя главнее размера от плагина, а
 * записанное в узел мимо раскладки переживает её смену. Кроме атрибутов-входов
 * пропов (`disabled`): они и есть проп, и значение ядра для них верно всегда.
 * Память — у элемента, а не у связки: связка новая на каждое подключение.
 *
 * Корень с полем — Input, CheckBox, Switch: корень — элемент потребителя
 * (`<div is="so-input">`), а `<input>` — узел шаблона. Форма видит поле сама:
 * `<input>` лежит в обычном DOM страницы, и `FormData`, `<label>`,
 * `<fieldset disabled>` и валидация достаются нативному полю. Атрибуты
 * потребителя делятся, как у Vue, React и Angular: статические атрибуты
 * разметки корня база при построении переносит на поле (`create()` шаблона
 * отдаёт его узел). На корне остаются `class`, `style`, `is`, `slot`,
 * атрибуты-входы пропов и свои атрибуты элемента. Записанное из кода позже на
 * корне и остаётся: наблюдателя за корнем нет. `id` у такого элемента — проп
 * поля, а не вход корня: два узла с одним `id` сломали бы `<label for>` — он
 * нашёл бы корень, а тот подпись не принимает. Поэтому атрибута `id` нет в
 * `observedAttributes`: атрибут разметки база берёт пропом первой сборки и
 * снимает с корня, а на поле его пишет шаблон из состояния. Из кода — `ctrl.id`;
 * `el.id` — собственный `id` корня.
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
 * Свои атрибуты элемента — сверх пропов дескриптора (`attributes` в описании
 * элемента): то, что элемент читает сам и ядру не отдаёт, — роль иконки
 * (`<span is="so-icon" icon="close">`). Значение хранит сам атрибут: свойство
 * на прототипе его отражает (`el.icon`; `null` и `undefined` атрибут снимают),
 * атрибут стоит в `observedAttributes`, и его смена — флаш привязок шаблона на
 * это имя, как смена пропа. Описание называет свойство, а атрибут — его имя
 * через дефис, как у пропов. Имя, занятое пропом (и `HOST_PROPS`), классом
 * элемента или нативным элементом, — ошибка описания: у атрибута или свойства
 * было бы два смысла.
 *
 * Перестановка в DOM — отключение и подключение — элемент не ломает. Свет и
 * структура создаются один раз, а каждое подключение — новая связка над тем же
 * инстансом: инстанс первой сборки следующая получает как `ctrl`, и `el.ctrl`
 * не меняется. Пропсы сборки — то, что задал потребитель атрибутом или
 * свойством, в последнем значении, которое видел элемент: перестановка не
 * откатывает то, что с тех пор поменяло ядро. Записанное без связки — до
 * подключения или вне DOM — ложится поверх (`_assemble`).
 *
 * Перенос силами базы — не перестановка (`relocation.ts`). Свои переносы база
 * делает сама: телепорт слоя уводит корень в цель и возвращает на место, а
 * раскладка света — содержимое элемента в точки шаблона. Узел едет одной
 * операцией DOM, из документа не выходя, и колбэки, которые вызвал перенос,
 * связку не трогают — ни у переносимого узла, ни у элементов внутри него.
 * Отключение, пришедшее, когда элемент снова в документе под переносимым
 * узлом, — пропуск, подключение при живой связке — пропуск. Признак переноса
 * держится до микрозадачи после него: с полифилом колбэки приходят его
 * наблюдателем позже. Так Frame не пересобирается на показе в цели и на
 * `contained`, кнопка в панели и в свете контейнера собирается один раз, а
 * отложенную первую сборку перенос не сбивает — её доводит `_resume`.
 * Перестановка, которую делает потребитель, по-прежнему пересобирает: под
 * другим провайдером элемент берёт его локаль.
 *
 * Обновления точечные. Подписка на связку (`subscribe`) сообщает, какой именно проп
 * изменился; имена копятся в `_dirty`, а на флаше применяются только те
 * привязки, которые за эти пропы отвечают. Сам флаш откладывается в
 * микротаску, потому что одно изменение в ядре часто даёт несколько триггеров.
 *
 * Слоты распределяются по атрибуту `slot` — это нативная HTML-семантика, а
 * не выдумка soldy. Shadow DOM для этого не используется: тема раскладывается
 * глобальными BEM-классами и через теневую границу не проходит, поэтому свет
 * переносится вручную в точки, объявленные шаблоном, — переносом силами базы.
 * Содержимое слота, которого шаблон не объявил, не выводится: места для него в
 * разметке компонента нет — так же его не рисуют остальные адаптеры, и так же
 * теневое дерево не рисует свет, не попавший ни в один `<slot>`. Слот, который
 * рисуется по состоянию (содержимое ручки Switch), выводит привязка шаблона
 * (`showSlot` контекста): снятое уходит из документа, показ — переносом силами
 * базы.
 */

import type { IComponentView, IComponentViewProps } from '@soldy-ui/core'
import {
	DEFAULT_SLOT,
	TSurface,
	type DescriptorComponentProps,
	type IComponentDescriptor,
	type TInstanceState,
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
import type { ITemplate, ITemplateContext, TSlotTarget, TSlotTargets } from '../template'
import { isDefining } from './defineElement'
import { isRelocating, relocate } from './relocation'
import {
	TElementAttributes,
	applyClasses,
	applyHidden,
	applyStyles,
	stylesOf,
	type TAppliedClasses,
	type TAppliedStyles,
	type THiddenDisplay,
} from './root-attributes'
import { TTeleport, type TTeleportPlace } from './teleport'
import type { TBinding, TUpdateListener } from './useAdapter'

/** Наборы ядра, которые база раскладывает на корень, — по умолчанию все. */
const ROOT_SETS = ['attrs', 'aria', 'dataset'] as const

/** Набор ядра на корне — см. `TRootSpec.sets`. */
export type TRootSet = (typeof ROOT_SETS)[number]

/**
 * Атрибуты корня с полем, которые при построении остаются на корне, сверх
 * входов пропов и своих атрибутов элемента: класс и стиль — корню, как у
 * остальных адаптеров, `is` — имя элемента, `slot` — место корня в свете его
 * родителя.
 */
const ROOT_ONLY = new Set(['class', 'style', 'is', 'slot'])

/** Атрибут корня с полем, который ведёт не корень, а поле (см. шапку). */
const CONTROL_ID = 'id'

/**
 * Содержимое ли узел: элемент или текст не из одних пробелов. Пробелы между
 * тегами — след переносов строк в разметке, а комментарий не рисуется. Якорь
 * увезённого корня — содержимое: он стоит на месте корня (`TTeleport.rootAt`).
 */
function isContent(node: ChildNode): boolean {
	if (node instanceof Element || TTeleport.rootAt(node)) return true

	return node instanceof Text && node.data.trim() !== ''
}

/**
 * Слот узла — атрибут `slot` на элементе, как в стандарте. Текстовые узлы
 * атрибутов не имеют и всегда попадают в слот по умолчанию, поэтому
 * `<button is="so-button">Текст</button>` работает как у нативной кнопки. У
 * якоря увезённого корня слот — корня: якорь стоит на его месте.
 */
function slotOf(node: ChildNode): string {
	const element = node instanceof Element ? node : TTeleport.rootAt(node)

	return element?.getAttribute('slot') ?? DEFAULT_SLOT
}

/** Группирует свет по слотам, не вынимая из элемента. */
function groupBySlot(nodes: readonly ChildNode[]): Map<string, ChildNode[]> {
	const groups = new Map<string, ChildNode[]>()

	for (const node of nodes) {
		const name = slotOf(node)
		const group = groups.get(name)

		if (group) {
			group.push(node)
		} else {
			groups.set(name, [node])
		}
	}

	return groups
}

/**
 * Точка слота, если шаблон её объявил. Имя слота — значение атрибута `slot`
 * из разметки, поэтому ищется только среди своих ключей: `slot="toString"`
 * не найдёт метод объекта.
 */
function targetOf(targets: TSlotTargets, name: string): TSlotTarget | undefined {
	return Object.hasOwn(targets, name) ? targets[name] : undefined
}

/** Кладёт узел в точку слота: внутрь узла или перед ним (`TSlotTarget`). */
function place(node: ChildNode, target: TSlotTarget): void {
	if (target.mode === 'append') {
		target.node.appendChild(node)
	} else {
		target.node.parentNode?.insertBefore(node, target.node)
	}
}

/**
 * Куда корню слоя — по состоянию, выходы называет описание корня: селектор
 * цели — непустая строка, всё остальное — цели нет.
 */
function placeOf(state: TStateSnapshot, names: TRootTeleport): TTeleportPlace {
	const target = state[names.target]

	return {
		target: typeof target === 'string' && target !== '' ? target : null,
		contained: state[names.contained] === true,
	}
}

/**
 * Карта атрибутов-входов элемента — атрибуты пропов дескриптора. У корня с
 * полем `id` в ней нет: это проп поля, и атрибут разметки база берёт пропом
 * первой сборки, а затем снимает с корня — наблюдаемым атрибутом это снятие
 * вернуло бы проп к умолчанию (см. шапку).
 */
function inputsOf(
	descriptor: IComponentDescriptor,
	control: boolean,
): ReadonlyMap<string, IAttributeBinding> {
	const map = buildAttributeMap(descriptor)

	if (control) map.delete(CONTROL_ID)

	return map
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
 * Свойства пропов элемента — те, что база вешает на прототип (`el.text`, см.
 * шапку). Состав — контракт дескриптора, как у пропсов React, Solid и Svelte
 * (`DescriptorComponentProps`): свои пропсы компонента, пропсы плагинов
 * дескриптора (`aria_label`, `anchor_anchor` у Frame) и пропсы связки
 * (`pluginProps`, `embedded`). Защищённых пропсов в контракте нет, как нет для
 * них и свойств на прототипе. Вычтено то, чего база на прототип не вешает:
 * свойства, которые у элемента уже есть по тегу (`TNative`), `HOST_PROPS` и
 * `ctrl` — его пара своя, в `ISoldyElement`.
 */
export type TSoldyElementProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TNative extends HTMLElement,
> = Omit<DescriptorComponentProps<TDescriptorFn>, keyof TNative | THostProp | 'ctrl'>

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
 *   на виду;
 * - `teleport` — корень уезжает в слой: имена выходов состояния с селектором
 *   цели и с признаком «на месте» (`{ target: 'target', contained: 'contained' }`
 *   у Frame), их называет компонент, как у Angular. Переносит корень
 *   `TTeleport` (`teleport.ts`) — сам элемент потребителя: на первой раскладке
 *   связки и на смене этих выходов. Цели нет — корень на месте и скрыт. Нет —
 *   корень стоит, где его написали;
 * - `sets` — какие наборы ядра база кладёт на корень, по умолчанию все три. У
 *   поля — только `attrs`: его `aria` стоит на `<input>`, его кладёт шаблон
 *   (`ownerAttributes`), а `dataset` разметка поля не выводит, как у
 *   остальных адаптеров;
 * - `control` — в корне поле (Input, CheckBox, Switch): `create()` шаблона
 *   отдаёт его узел, и статические атрибуты разметки корня база при
 *   построении переносит на него, а `id` — проп поля, а не вход корня (см.
 *   шапку). Как у `control` в описании корня Angular.
 */
export type TRootSpec = {
	readonly style?: string
	readonly hides?: boolean
	readonly teleport?: TRootTeleport
	readonly sets?: readonly TRootSet[]
	readonly control?: boolean
}

/** Слой в описании корня (`TRootSpec.teleport`): имена выходов состояния. */
export type TRootTeleport = {
	/** Выход с селектором цели: `target` у Frame. */
	readonly target: string
	/** Выход «корень на месте, без переноса»: `contained` у Frame. */
	readonly contained: string
}

/** Всё, чем элементы soldy отличаются друг от друга. */
export interface ISoldyElementSpec<TInstance> {
	/** Дескриптор компонента: по нему строятся атрибуты и свойства пропов. */
	readonly descriptor: IComponentDescriptor
	/** Шаблон: структура в корне и привязки пропов. */
	readonly template: ITemplate<TInstance>
	/** Описание корня — см. `TRootSpec`. */
	readonly root?: TRootSpec
	/**
	 * Свои атрибуты элемента сверх пропов дескриптора — имена свойств (см.
	 * шапку): роль иконки (`icon`). Привязка шаблона на такое имя читает
	 * значение из атрибута корня.
	 */
	readonly attributes?: readonly string[]
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
	/** В корне поле (`TRootSpec.control`): `id` — проп поля, а не вход корня (см. шапку). */
	const control = spec.root?.control === true
	const attributes: ReadonlyMap<string, IAttributeBinding> = inputsOf(spec.descriptor, control)
	/** Атрибуты-входы пропов: их значение в наборе ядра верно всегда. */
	const inputs: ReadonlySet<string> = new Set(attributes.keys())
	/** Наборы ядра на корне (`TRootSpec.sets`). */
	const rootSets: readonly TRootSet[] = spec.root?.sets ?? ROOT_SETS
	/** Свои атрибуты элемента: имя атрибута → имя свойства (`ISoldyElementSpec.attributes`). */
	const own: ReadonlyMap<string, string> = new Map(
		(spec.attributes ?? []).map((name) => [toAttributeName(name), name]),
	)
	/** Имя стиль-выхода компонента (`TRootSpec.style`); нет — стиль только от плагина. */
	const styleOutput = spec.root?.style
	/** Прячет ли видимость корень (`TRootSpec.hides`). */
	const hides = spec.root?.hides ?? true
	/** Имена выходов слоя (`TRootSpec.teleport`); нет — корень в слой не уезжает. */
	const layer = spec.root?.teleport

	class TSoldyElement extends Native implements ISoldyElement<TInstance> {
		static get observedAttributes(): string[] {
			return [...attributes.keys(), ...own.keys()]
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
		/** Точки слотов, которые объявил шаблон; пока структуры нет — ни одной. */
		private _targets: TSlotTargets = {}
		/** Слоты, которые привязка сняла (`showSlot`): их содержимое вне документа. */
		private readonly _hidden = new Set<string>()
		/** Узел слота по умолчанию; пока структуры нет — сам элемент. */
		private _content: HTMLElement = this
		private readonly _dirty = new Set<string>()
		private _flushQueued = false
		private _connected = false
		/** Первое подключение отложено (см. шапку). */
		private _deferred = false

		/** Память раскладки корня: что поставила база (см. `root-attributes.ts`). */
		private _appliedClasses: TAppliedClasses = new Set()
		/** Раскладчик атрибутов элемента: наборы ядра корня — его нижние слои. */
		private readonly _attributes = TElementAttributes.of(this)
		private _appliedStyles: TAppliedStyles = new Map()
		private _hiddenDisplay: THiddenDisplay = undefined

		/** Контекст привязок шаблона — живой вид элемента (`_viewOf`). */
		private readonly _view: ITemplateContext<TInstance> = this._viewOf()

		/** Телепорт корня слоя (`TRootSpec.teleport`) — заводит его первая раскладка. */
		private _teleport?: TTeleport
		/** Корень на своём месте: у слоя — в цели или на месте; без цели — нет. */
		private _placed = true

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
			// Колбэк узла, снятого раньше своей очереди: вне документа собирать
			// нечего — ни места, ни провайдера у элемента нет
			if (!this.isConnected) return

			// Живая связка — подключение после переноса силами базы (см. шапку)
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
			// Перенос силами базы — не отключение: элемент снова в документе, и
			// связка остаётся (см. шапку)
			if (isRelocating(this)) return

			this._connected = false
			this._binding?.destroy()
			this._binding = undefined
			// Увезённый корень сняли или переставили: якорь уходит с места
			this._teleport?.release()
		}

		attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
			const attribute = attributes.get(name)

			if (attribute) {
				// `undefined` тоже пишется: атрибут сняли — проп больше не задан, и
				// связка вернёт его к умолчанию
				this._write(attribute.prop, coerceAttribute(value, attribute))

				return
			}

			// Свой атрибут: значение хранит он сам, и привязки читают его с корня
			const property = own.get(name)

			if (property !== undefined) this._mark(property)
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
		 * Строит структуру шаблона в элементе и раскладывает по ней свет — один раз,
		 * при первом подключении. Дальше свет живёт в структуре, и раскладывать его
		 * заново нельзя: в элементе уже своя разметка, и при перестановке она
		 * попала бы в свет.
		 */
		private _build(): void {
			const groups = groupBySlot(Array.from(this.childNodes))
			const light = new Map<string, ChildNode[]>()

			// Слот без содержимого (`isContent`) не задан — см. `_distribute`
			for (const [name, nodes] of groups) {
				if (nodes.some(isContent)) light.set(name, nodes)
			}

			const parts = spec.template.create(this, (name) => light.has(name))

			if (control) this._handOver(parts.control)

			// Слоты не наследуются: слота по умолчанию может не быть вовсе
			// (ProgressSpinner), и узлом содержимого тогда остаётся корень
			const fallback = targetOf(parts.slots, DEFAULT_SLOT)

			this._content = fallback?.mode === 'append' ? fallback.node : this
			this._targets = parts.slots
			this._light = light
			this._distribute(groups)
		}

		/**
		 * Статические атрибуты разметки корня с полем — полю (см. шапку). На
		 * корне остаются `class`, `style`, `is`, `slot`, атрибуты-входы пропов и
		 * свои атрибуты элемента; `id` база берёт пропом первой сборки и снимает
		 * с корня — на поле его пишет шаблон из состояния. Колбэков снятие не
		 * вызывает: ни один из этих атрибутов элемент не наблюдает.
		 */
		private _handOver(field: HTMLElement | undefined): void {
			if (!field) {
				throw new Error('[soldy] Описание корня объявляет поле, а шаблон его не построил')
			}

			for (const name of this.getAttributeNames()) {
				if (ROOT_ONLY.has(name) || attributes.has(name) || own.has(name)) continue

				const value = this.getAttribute(name) ?? ''

				if (name === CONTROL_ID) {
					this._write(CONTROL_ID, value)
				} else {
					field.setAttribute(name, value)
				}

				this.removeAttribute(name)
			}
		}

		/**
		 * Раскладывает свет по точкам, объявленным шаблоном, — в порядке их
		 * объявления: в одну точку `append` содержимое слота, объявленного
		 * раньше, встаёт раньше при любом порядке в разметке.
		 *
		 * Узел, которому есть место, едет туда переносом силами базы (см. шапку):
		 * одной операцией, из документа не выходя. Элемент soldy в нём не
		 * пересобирается — ни собранный раньше контейнера (разметка страницы,
		 * сборку контейнера отложила регистрация), ни несобранный: его первое
		 * подключение приходит уже на новом месте, в документе, под провайдером.
		 * Слот, который выводит привязка (`showSlot`), раскладывается так же:
		 * первая раскладка связки его оставит или снимет.
		 *
		 * Узлы без места снимаются:
		 * - слот без содержимого (`isContent`) не задан. Иначе пробелы вокруг
		 *   `<svg slot="leading">` на своей строке стали бы слотом по умолчанию и
		 *   заглушили бы проп `text` — компилятор Vue такие пробелы и комментарии
		 *   выбрасывает, и одна разметка вела бы себя по-разному. Пробелы внутри
		 *   содержимого (`<b>Сохранить</b> <i>файл</i>`) остаются;
		 * - слот, которого шаблон не объявил, места в разметке не имеет, и его
		 *   содержимое не выводится: в корне оно оказалось бы там, где компонент
		 *   его не ждёт, — текст внутри кольца ProgressSpinner вошёл бы в узел с
		 *   ролью `progressbar`.
		 */
		private _distribute(groups: ReadonlyMap<string, ChildNode[]>): void {
			for (const [name, target] of Object.entries(this._targets)) {
				const nodes = this._light?.get(name)

				if (nodes) {
					relocate(nodes, () => {
						for (const node of nodes) place(node, target)
					})
				}
			}

			for (const [name, nodes] of groups) {
				if (this._light?.has(name) && targetOf(this._targets, name)) continue

				for (const node of nodes) node.remove()
			}
		}

		/**
		 * Показать или снять слот по состоянию — `showSlot` контекста шаблона.
		 * Снятое уходит из документа, и элементы soldy в нём отключаются, как при
		 * перестановке; показ — переносом силами базы, в точку слота. Слот не
		 * задан или не объявлен — делать нечего; уже так — тоже.
		 */
		private _showSlot(name: string, shown: boolean): void {
			const nodes = this._light?.get(name)
			const target = targetOf(this._targets, name)

			if (!nodes || !target || this._hidden.has(name) !== shown) return

			if (shown) {
				this._hidden.delete(name)
				relocate(nodes, () => {
					for (const node of nodes) place(node, target)
				})
			} else {
				this._hidden.add(name)

				for (const node of nodes) node.remove()
			}
		}

		private _onUpdate(name: string, value: unknown): void {
			this._values.set(name, value)
			this._mark(name)
		}

		/**
		 * Имя — к отрисовке: на флаше применятся привязки, которые за него
		 * отвечают. Без подключения флаша нет — имя дождётся полной отрисовки
		 * следующего подключения.
		 */
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

		/**
		 * Контекст привязок шаблона — живой вид элемента, один на всё время
		 * жизни: узел содержимого, состояние и инстанс он отдаёт в момент
		 * обращения. Поэтому обработчик, который шаблон завёл на одной связке и
		 * который запомнил контекст, после перестановки зовёт инстанс новой
		 * связки, а не прежней.
		 */
		private _viewOf(): ITemplateContext<TInstance> {
			const content = (): HTMLElement => this._content
			const state = (): TInstanceState<TInstance> => this.state
			const instance = (): TInstance | undefined => this.ctrl

			return {
				root: this,
				get content() {
					return content()
				},
				get state() {
					return state()
				},
				get ctrl() {
					return instance()
				},
				hasSlot: (name) => this._light?.has(name) ?? false,
				showSlot: (name, shown) => this._showSlot(name, shown),
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

			// Наборы корня — нижние слои раскладчика элемента: память у слоёв одна,
			// и снятие записи в одном не уносит чужие. Входы пропов называют они
			for (const name of rootSets) {
				if (changed(name)) this._attributes.set(name, state[name] ?? {}, inputs)
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

			// Слой — в цель или на место: на первой раскладке связки и на смене
			// цели или «на месте». Корень потребителя, и переносит его база
			const placing =
				layer !== undefined && (full || changed(layer.target) || changed(layer.contained))

			if (placing) {
				this._teleport ??= new TTeleport(this)
				this._placed = this._teleport.place(placeOf(state, layer))
			}

			// Скрытие — поверх стиля: `display: none` не перекрывает ни раскладка,
			// ни потребитель. Прячут корень `rendered` и `visible`, если видимость
			// его прячет, и слой без цели: корень на месте, а места у панели нет
			if (changed('rendered') || changed('visible') || placing) {
				const unseen = hides && (state.rendered === false || state.visible === false)

				this._hiddenDisplay = applyHidden(
					this,
					unseen || !this._placed,
					this._hiddenDisplay,
				)
			}

			for (const binding of spec.template.bindings) {
				if (full || binding.props.some(changed)) binding.apply(this._view)
			}
		}

		/**
		 * Свойства пропов на прототипе — JS-путь `el.text = 'Click'`. Атрибуты
		 * покрывают только примитивы, поэтому свойства — единственный способ
		 * передать объект или готовый инстанс. Пропускаются `ctrl` (своя пара
		 * выше), пропы `HOST_PROPS` и свойства, которые у элемента уже есть по
		 * тегу: нативное свойство остаётся нативным (см. шапку).
		 *
		 * Свойства своих атрибутов — следом, отражением атрибута: значение
		 * хранит он сам (см. шапку). Имя, которое уже занято — пропом (его
		 * атрибутом или свойством), `HOST_PROPS`, классом элемента или нативным
		 * элементом, — ошибка описания, а не повод перекрыть чужое.
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

					get(this: TSoldyElement): string | null {
						return this.getAttribute(attribute)
					},

					set(this: TSoldyElement, value: unknown) {
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

	return TSoldyElement
}
