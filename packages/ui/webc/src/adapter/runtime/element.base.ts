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
 *   тем же инстансом, `bindElement` корня и полная отрисовка. Подключение
 *   бывает отложено — см. ниже. Подключение элемента, которого в документе уже
 *   нет (колбэк узла, снятого раньше своей очереди), — пропуск
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
 * Любое подключение, пришедшее, пока подключается другой элемент soldy, ждёт
 * его конца и идёт сразу после него, в порядке прихода (ожидание,
 * `waiting.ts`): раскладка света переносит элементы разметки, `create()`
 * ставит детали, первая отрисовка — элементы из данных, и их колбэки приходят
 * внутри подключения родителя. Собираться им там рано: элемент коллекции не
 * нашёл бы движка, который владелец опускает лифтом при своей сборке, а деталь
 * — света, который владелец ей назначает. Свою очередь элемент доводит тем же
 * `_resume` и, если его к ней сняли, не собирается.
 *
 * Тег — `localName` корня (`button`): база отдаёт его ядру пропом `tag` при
 * каждой сборке. Атрибута и свойства `tag` нет (`HOST_PROPS`): тег корня задан
 * разметкой — тегом элемента, а у обёрнутого корня (ниже) — шаблоном. Для ядра
 * это нативный тег: `role` и `tabindex` оно не пишет, а `disabled` пишет
 * нативным атрибутом, как у `<Button>` во Vue.
 *
 * Корень — сам элемент, кроме компонента, чей корень — узел шаблона внутри
 * элемента-обёртки (`TRootSpec.wrapped`): на него ложится всё, что ядро пишет
 * на корень, с ним связан `TElementPlugin`, и тег ядру уходит его. Обёртка
 * бывает двух видов. Окно таблицы (`<div is="so-table">`, класс
 * `so-table__viewport`) вокруг `table` — внешний узел компонента: элементу
 * остаются скрытие и класс и стиль потребителя — как окну у Vue и React, — а
 * остальные атрибуты разметки у таблицы едут на корень: он же её поле
 * (`control`, ниже). Менеджер тостов `<so-toasts>` вокруг приложения — только
 * место: его корень, регион, уезжает в слой, а элемент без коробки остаётся
 * с приложением, у Vue узла у него нет вовсе. Поэтому внешний узел — сам
 * регион: на него база переносит все атрибуты разметки элемента, класс и стиль
 * тоже, и его же прячет.
 *
 * Компонент бывает и невизуальным — окно `<so-virtual>`: классов, наборов и
 * видимости у него нет, и база, которая читает их из состояния по имени,
 * ничего на элемент не кладёт.
 *
 * То, что ядро пишет на корень, база раскладывает на него сама — это
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
 * (у Skeleton нет — она убирает только заглушку), стоит ли корень по месту в
 * коллекции (`order` — элементы Tabs и Accordion), без какого выхода корень
 * скрыт (`shownBy` — `active` у панели таба), уезжает ли корень в слой
 * (`teleport` у Frame, Dialog, Drawer и Toasts): тогда база уводит его в цель
 * по селектору (`TTeleport`, `teleport.ts`), а без цели прячет на месте — это
 * ещё одна причина скрытия, рядом с `rendered` и `visible`. Спутник корня слоя
 * — подложку окна и выезжающей панели, которую строит шаблон
 * (`TTemplateParts.companion`), — база ставит прямо перед корнем, увозит и
 * возвращает с ним и прячет вместе с ним. Ещё описание корня называет, какие
 * наборы ядра лежат на корне (`sets`)
 * и из какого выхода берётся его слой `aria` (`aria` — `rootAria` у Slider),
 * есть ли в корне поле (`control`, см. ниже), объявляет ли поле `id`, когда
 * атрибуты разметки остаются корню (`fieldId` — Rating, см. ниже), и не
 * обёртка ли элемент вокруг корня (`wrapped`, см. выше).
 *
 * Атрибуты, классы и свойства стиля потребителя главнее того, что пишет ядро:
 * по каждому имени база помнит, что поставила сама, своё пишет и снимает, а
 * чужое не трогает — `style.width` потребителя главнее размера от плагина, а
 * записанное в узел мимо раскладки переживает её смену. Кроме атрибутов-входов
 * пропов (`disabled`): они и есть проп, и значение ядра для них верно всегда.
 * Память — у элемента, а не у связки: связка новая на каждое подключение.
 *
 * Корень с полем — Input, CheckBox, Switch, радио, а у таба и секции —
 * строкой, у ListBox и Tabs — узлом списка с ролью: корень — элемент
 * потребителя (`<div is="so-input">`), а `<input>`, строка или узел списка —
 * узел шаблона. У таблицы поле — её корень `table` внутри окна: элемент —
 * окно, и атрибуты потребителя делятся между ним и `table`, где роль и имя.
 * Форма видит поле сама: `<input>` лежит в обычном
 * DOM страницы, и `FormData`, `<label>`, `<fieldset disabled>` и валидация
 * достаются нативному полю. Атрибуты потребителя делятся, как у Vue, React и
 * Angular: статические атрибуты разметки корня база при построении переносит
 * на поле (`create()` шаблона отдаёт его узел). На корне остаются `class`,
 * `style`, `is`, `slot`, атрибуты-входы пропов и свои атрибуты элемента.
 * Записанное из кода позже на корне и остаётся: наблюдателя за корнем нет.
 * `id` поля, которое его объявляет (Input, CheckBox, Switch), — проп поля, а не
 * вход корня: два узла с одним `id` сломали бы `<label for>` — он нашёл бы
 * корень, а тот подпись не принимает. Поэтому атрибута `id` нет в
 * `observedAttributes`: атрибут разметки база берёт пропом первой сборки и
 * снимает с корня, а на поле его пишет шаблон из состояния. Из кода —
 * `ctrl.id`; `el.id` — собственный `id` корня. У радио, строки, узла списка и
 * таблицы своего `id` нет, и атрибут разметки едет на поле вместе со всеми,
 * как `controlAttrs` у Vue.
 *
 * Поле с `id` бывает и у корня, чьи атрибуты разметки никуда не едут
 * (`fieldId`): у Rating, как у Vue, атрибуты потребителя остаются корню —
 * указатель поле не ловит, и обработчик на поле не сработал бы никогда, — а
 * `id` — проп поля. Путь у него тот же: атрибут разметки — пропом первой
 * сборки, с корня снят, из кода — `ctrl.id`. Без признака `id` встал бы и на
 * корень, и на поле.
 *
 * Сборка — `createWebcAdapterContext` в setup-слое компонента: локаль
 * поддерева она берёт у ближайшего `<so-locale-provider>` вверх от элемента.
 * Связка заводится на подключение, поэтому элемент, переставленный под другой
 * провайдер, собирается уже с его локалью.
 *
 * У коллекционного компонента — владельца коллекции, её элемента, панели таба
 * — контекстов два, свой и фасада, и setup-слой отдаёт их одной связкой
 * (`joinBindings`). Описание элемента называет и дескриптор фасада (`facade`):
 * его пропсы — тоже атрибуты-входы и свойства элемента (`items`, `engine`,
 * `active`, `selected`), его свойства — в том же состоянии, а сам фасад шаблон
 * получает из контекста (`ctx.facade`). У пункта с подменю контекстов три:
 * он пункт меню над ним и меню своих пунктов, — и описание называет ещё и
 * дескриптор фасада владельца (`ownerFacade`): его пропсы — тоже входы,
 * его свойства — в том же состоянии, а `ctx.facade` — фасад пункта.
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
 *
 * Свет детали. Точка может вести в слот детали шаблона (`TSlotTarget.slot`):
 * узлы встают в деталь — строку таба, заголовок секции, — пока та ждёт своей
 * сборки, и назначаются её слоту (`assignment.ts`). Раскладка света детали
 * берёт назначенный слот раньше атрибута `slot`: `header` секции становится
 * `default` заголовка, `close-icon` таба — содержимым кнопки закрытия. Тем же
 * назначением шаблон отдаёт детали свою разметку (`lend`), а владелец
 * коллекции — копии образцов в элемент из данных.
 *
 * Точка-образец (`sample`) — слот, содержимое которого база не выводит, а
 * держит у себя: слот задан (`hasSlot`), а копию — содержимого `<template>`
 * или самого узла — отдаёт контекст (`sample`). Так владелец коллекции берёт
 * слоты `item-*`: scope у слотов Web Components нет, и копию одного образца
 * получает каждый элемент из данных.
 *
 * Узлы слота. Набор, который остальные адаптеры отдают содержимому слота в
 * scope, — связку с панелью триггеру Popover, Tooltip и Menu (`triggerAria`), —
 * шаблон кладёт на первый элемент слота сам (`ownerAttributes`): scope у
 * слотов нет, и привязать набор потребитель не может. Узлы слота в его точке
 * — те самые, что написал потребитель, — отдаёт контекст (`slotted`): триггер
 * остаётся тем же узлом, а набор на нём сменяется на месте.
 *
 * Состояние связки, которое шаблон получает в контексте, — свойства инстанса и
 * выходы плагинов дескриптора (`TOutputs` описания элемента): пометку панели
 * владельцем (`dismiss_ownerAttribute`) шаблон Popover читает с типом, как
 * разметка остальных адаптеров.
 */

import type { IComponent, IComponentProps } from '@soldy-ui/core'
import {
	DEFAULT_SLOT,
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
import type { ITemplate, ITemplateContext, TSlotTarget, TSlotTargets } from '../template'
import { assignSlot, takeAssignedSlot } from './assignment'
import { isContent } from './content'
import { isDefining } from './defineElement'
import { isRelocating, relocate } from './relocation'
import {
	TElementAttributes,
	applyClasses,
	applyHidden,
	applyStyles,
	classesOf,
	orderOf,
	setOf,
	stylesOf,
	type TAppliedClasses,
	type TAppliedStyles,
	type THiddenDisplay,
} from './root-attributes'
import { markSoldyElement } from './soldy-mark'
import { TTeleport, type TTeleportPlace } from './teleport'
import type { TBinding, TBindingState, TUpdateListener } from './useAdapter'
import { connecting, isConnecting, wait } from './waiting'

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

/**
 * Атрибуты элемента-обёртки, чей корень уезжает в слой, которые остаются на
 * элементе, сверх входов пропов и своих атрибутов: `is` — имя элемента, `slot`
 * — его место в свете родителя. Класс и стиль уходят корню вместе с остальным:
 * элемент — только место, у Vue на нём нет и узла (см. шапку).
 */
const PLACE_ONLY = new Set(['is', 'slot'])

/** Атрибут корня с полем, который ведёт не корень, а поле, — если поле его объявляет (см. шапку). */
const CONTROL_ID = 'id'

/** Точка, в которую база кладёт свет: всё, кроме образца. */
type TPlacedTarget = Exclude<TSlotTarget, { mode: 'sample' }>

/**
 * Слот узла — назначенный шаблоном владельца (свет детали, см. шапку), а без
 * назначения — атрибут `slot` на элементе, как в стандарте. Текстовые узлы
 * атрибутов не имеют и без назначения попадают в слот по умолчанию, поэтому
 * `<button is="so-button">Текст</button>` работает как у нативной кнопки. У
 * якоря увезённого корня и у спутника корня слот — корня: якорь стоит на его
 * месте, спутник — рядом с ним, и в свет контейнера они встают вместе.
 */
function slotOf(node: ChildNode): string {
	const assigned = takeAssignedSlot(node)

	if (assigned !== undefined) return assigned

	const element = TTeleport.rootAt(node) ?? (node instanceof Element ? node : undefined)

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

/**
 * Кладёт узел в точку слота: внутрь узла или перед ним (`TSlotTarget`). Точка,
 * которая ведёт в слот детали, назначает узлу этот слот: деталь разложит его
 * по назначению, когда соберётся. Перед меткой в свете детали узел встаёт
 * туда, где метка сейчас: до сборки детали — в её свет, после — в её слот.
 */
function place(node: ChildNode, target: TPlacedTarget): void {
	if (target.slot !== undefined) assignSlot(node, target.slot)

	if (target.mode === 'append') {
		target.node.appendChild(node)
	} else {
		target.node.parentNode?.insertBefore(node, target.node)
	}
}

/**
 * Копия узла образца: у `<template>` — копия его содержимого, у остального —
 * самого узла, без атрибута `slot`: это имя слота владельца, а место копии
 * назначает шаблон.
 */
function copyOf(node: ChildNode, owner: Document): Node {
	if (node instanceof HTMLTemplateElement) return owner.importNode(node.content, true)

	const copy = node.cloneNode(true)

	if (copy instanceof Element) copy.removeAttribute('slot')

	return copy
}

/**
 * Куда корню слоя — по состоянию, выходы называет описание корня: селектор
 * цели — непустая строка, всё остальное — цели нет. Выхода «на месте» нет
 * (окно) — корень всегда в цели.
 */
function placeOf(state: TStateSnapshot, names: TRootTeleport): TTeleportPlace {
	const target = state[names.target]

	return {
		target: typeof target === 'string' && target !== '' ? target : null,
		contained: names.contained !== undefined && state[names.contained] === true,
	}
}

/**
 * Карта атрибутов-входов элемента — атрибуты пропов его дескрипторов: своего
 * и, у коллекционного компонента, фасада. Свой проп главнее одноимённого
 * пропа фасада: элемент отдаёт дельту обеим связкам, и каждая берёт свои.
 */
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

/** Что у элемента своего, помимо нативного: инстанс ядра и его состояние. */
export interface ISoldyElement<TInstance, TFacade = unknown, TOwnerFacade = unknown> {
	/**
	 * Свойства инстанса со снимком через `valueOf()` — см. `TInstanceState`; у
	 * коллекционного компонента — вместе со свойствами фасада, а у пункта с
	 * подменю — и фасада своей коллекции.
	 */
	readonly state: TBindingState<TInstance, TFacade, unknown, TOwnerFacade>
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
 * (`pluginProps`, `embedded`). Пропсы фасада коллекции (`items`, `active`) в
 * нём уже есть: класс фасада объявляет пропсами `IComponentProps`, а их типы
 * несёт интерфейс пропсов ядра компонента (`ITabsProps`). Защищённых пропсов в
 * контракте нет, как нет для них и свойств на прототипе. Вычтено то, чего база
 * на прототип не вешает: свойства, которые у элемента уже есть по тегу
 * (`TNative`), `HOST_PROPS` и `ctrl` — его пара своя, в `ISoldyElement`.
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
 * - `order` — корень встаёт по месту в коллекции: `order` фасада элемента
 *   уходит в стиль корня поверх стиль-выхода. У элементов Tabs и Accordion да
 *   — их ряд флексбокс, и элемент стоит по номеру в коллекции, а не по месту
 *   в разметке, как у Vue. У радио нет: радио одной группы стоят где угодно, и
 *   номер увёл бы радио по чужому флекс-ряду. Как у Angular;
 * - `shownBy` — выход состояния, без которого корень скрыт: пока он не
 *   `true`, корень прячется, как при `visible=false`. У панели таба это
 *   `active` фасада — панель видна, только пока активен её таб. Как у Angular;
 * - `teleport` — корень уезжает в слой: имена выходов состояния с селектором
 *   цели и с признаком «на месте» (`{ target: 'target', contained: 'contained' }`
 *   у Frame и Drawer, у Dialog и Toasts — только цель), их называет
 *   компонент, как у Angular. Переносит корень `TTeleport` (`teleport.ts`) —
 *   сам элемент потребителя, а у обёртки (`wrapped`) — корень внутри неё: на
 *   первой раскладке связки и на смене этих выходов. Спутник корня, который
 *   строит шаблон (`TTemplateParts.companion`, подложка окна), стоит прямо
 *   перед ним и ездит с ним. Цели нет — корень на месте и скрыт вместе со
 *   спутником. Нет — корень стоит, где его написали, и спутника у него нет;
 * - `sets` — какие наборы ядра база кладёт на корень, по умолчанию все три. У
 *   поля — `attrs` и `dataset`: его `aria` стоит на `<input>`, его кладёт
 *   шаблон (`ownerAttributes`), а `dataset` — на корне, где его читает тема,
 *   как у остальных адаптеров;
 * - `aria` — имя выхода состояния, чей набор база кладёт на корень слоем
 *   `aria`, по умолчанию сам `aria`. У Slider — `rootAria`: у нескольких ручек
 *   корень — группа с именем ползунка, у одной набор пуст, а `aria` ползунка
 *   уходит полям ручек — его кладёт шаблон из `thumbs`. Говорит только об
 *   источнике слоя: лежит ли он на корне, решает `sets`;
 * - `control` — в корне поле (Input, CheckBox, Switch, радио), строка
 *   элемента коллекции (таб, секция, элемент списка) или узел списка с ролью
 *   (ListBox, Tabs), а у обёртки — сам корень внутри неё (`table`):
 *   `create()` шаблона отдаёт его узел, и статические атрибуты разметки
 *   элемента база при построении переносит на него, а `id` поля, которое его
 *   объявляет, — проп поля, а не вход корня (см. шапку). Как у `control` в
 *   описании корня Angular;
 * - `fieldId` — `id` — проп поля, хотя атрибуты разметки остаются корню и на
 *   поле не едут: Rating (см. шапку). Атрибут `id` разметки база берёт пропом
 *   первой сборки и снимает с корня, как у корня с полем, где так и без
 *   признака. Дескриптор без пропа `id` с признаком — ошибка описания;
 * - `wrapped` — элемент — обёртка вокруг корня, а корень — узел шаблона
 *   внутри него: окно таблицы вокруг `table`. `create()` шаблона отдаёт узел
 *   корня (`TTemplateParts.root`), и на него база кладёт классы, наборы и
 *   стиль ядра, с ним связывает `TElementPlugin` и его тег отдаёт ядру.
 *   Элементу остаются скрытие и класс и стиль потребителя — он внешний узел
 *   компонента, как окно у Vue и React; остальные атрибуты разметки уходят
 *   корню, если он же и поле (`control`). Входов пропов у такого корня нет:
 *   их атрибуты потребитель пишет на элемент. Обёрнутый корень, который
 *   уезжает в слой (`teleport`), — сам внешний узел компонента: регион тостов
 *   в `<so-toasts>`, а элемент без коробки остаётся на месте со светом —
 *   приложением — и у Vue узла не имеет вовсе. Поэтому атрибуты разметки
 *   элемента, класс и стиль тоже, база при построении переносит на корень,
 *   кроме `is`, `slot`, входов пропов и своих атрибутов, а скрытие ложится на
 *   корень — приложение в элементе остаётся на виду. Нет — корень сам элемент.
 */
export type TRootSpec = {
	readonly style?: string
	readonly hides?: boolean
	readonly order?: boolean
	readonly shownBy?: string
	readonly teleport?: TRootTeleport
	readonly sets?: readonly TRootSet[]
	readonly aria?: string
	readonly control?: boolean
	readonly fieldId?: boolean
	readonly wrapped?: boolean
}

/** Слой в описании корня (`TRootSpec.teleport`): имена выходов состояния. */
export type TRootTeleport = {
	/** Выход с селектором цели: `target` у Frame. */
	readonly target: string
	/**
	 * Выход «корень на месте, без переноса»: `contained` у Frame и Drawer. Нет
	 * — места на месте у слоя нет (окно, регион тостов): корень всегда в цели.
	 */
	readonly contained?: string
}

/**
 * Всё, чем элементы soldy отличаются друг от друга. `TOutputs` — выходы
 * плагинов дескриптора компонента (`DescriptorPluginOutputs`): их связка
 * отдаёт в состоянии, а шаблон читает с типом (пометку панели владельцем у
 * Popover и Tooltip). `TOwnerFacade` — фасад владельца, своей коллекции, у
 * части, которая сразу и элемент коллекции над ней, и владелец своей (пункт с
 * подменю).
 */
export interface ISoldyElementSpec<
	TInstance,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
> {
	/** Дескриптор компонента: по нему строятся атрибуты и свойства пропов. */
	readonly descriptor: IComponentDescriptor
	/**
	 * Дескриптор фасада коллекции — у коллекционного компонента (`TabsCollectionDescriptor`):
	 * его пропсы — тоже атрибуты-входы и свойства элемента (см. шапку).
	 */
	readonly facade?: IComponentDescriptor
	/**
	 * Дескриптор фасада владельца — своей коллекции у части с тремя
	 * контекстами, пункта с подменю (`MenuSubmenuCollectionDescriptor`): тогда
	 * `facade` — дескриптор её фасада элемента, а пропсы своей коллекции
	 * (`items`, `engine`, `trackBy`, группы) — тоже атрибуты-входы и свойства
	 * элемента.
	 */
	readonly ownerFacade?: IComponentDescriptor
	/** Шаблон: структура в корне и привязки пропов. */
	readonly template: ITemplate<TInstance, TFacade, TOutputs, TOwnerFacade>
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
	): TBinding<TInstance, TFacade, TOutputs, TOwnerFacade>
}

/**
 * Нативный класс тега: `HTMLButtonElement`, `HTMLDivElement`. Rest-параметр
 * `any[]` — форма конструктора миксина, без неё TypeScript не сложит класс
 * базы с нативным.
 */
export type TNativeElementClass = new (...args: any[]) => HTMLElement

/** Класс элемента soldy — то, что база добавляет к нативному классу тега. */
export type TSoldyElementClass<TInstance, TFacade = unknown, TOwnerFacade = unknown> = (new (
	...args: any[]
) => ISoldyElement<TInstance, TFacade, TOwnerFacade>) & {
	readonly observedAttributes: string[]
}

/**
 * Класс элемента soldy поверх нативного класса тега.
 *
 * Компонент — любой компонент ядра, визуальный или нет (`IComponent`): что
 * у визуального есть сверх событий — классы, наборы, видимость, — база читает
 * из состояния по имени (см. шапку).
 *
 * Тип результата объявлен явно — нативный класс плюс своё (`ISoldyElement`):
 * класс, выведенный из выражения, TypeScript в декларации не выпустит, у него
 * приватные члены. Выходы плагинов (`TOutputs`) — дело шаблона: в состоянии
 * элемента для потребителя (`el.state`) их тип не обещан.
 */
export function SoldyElement<
	TNative extends TNativeElementClass,
	TInstance extends IComponent<IComponentProps, any>,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
>(
	Native: TNative,
	spec: ISoldyElementSpec<TInstance, TFacade, TOutputs, TOwnerFacade>,
): TNative & TSoldyElementClass<TInstance, TFacade, TOwnerFacade> {
	/**
	 * Описания элемента: своё и, у коллекционного компонента, фасада, а у пункта
	 * с подменю — ещё и фасада своей коллекции.
	 */
	const descriptors = [spec.descriptor, spec.facade, spec.ownerFacade].filter(
		(descriptor): descriptor is IComponentDescriptor => descriptor !== undefined,
	)
	/** В корне поле (`TRootSpec.control`). */
	const control = spec.root?.control === true
	/** Элемент — обёртка вокруг корня (`TRootSpec.wrapped`). */
	const wrapped = spec.root?.wrapped === true
	const attributes = attributesOf(descriptors)

	if (spec.root?.fieldId === true && !attributes.has(CONTROL_ID)) {
		throw new Error('[soldy] Описание корня объявляет id поля, а у дескриптора пропа id нет')
	}

	/**
	 * `id` — проп поля, а не вход корня: поле его объявляет — в корне с полем
	 * (`control`) или по признаку описания (`fieldId`), см. шапку. Карта его
	 * тогда не наблюдает — атрибут разметки база берёт пропом первой сборки и
	 * снимает с корня, а наблюдаемым атрибутом это снятие вернуло бы проп к
	 * умолчанию.
	 */
	const fieldId = (control || spec.root?.fieldId === true) && attributes.has(CONTROL_ID)

	if (fieldId) attributes.delete(CONTROL_ID)

	/**
	 * Атрибуты-входы пропов на корне: их значение в наборе ядра верно всегда. У
	 * обёрнутого корня входов нет — атрибуты пропов стоят на элементе.
	 */
	const inputs: ReadonlySet<string> = new Set(wrapped ? [] : attributes.keys())
	/** Выход со слоем `aria` корня (`TRootSpec.aria`); нет — сам `aria`. */
	const ariaOutput = spec.root?.aria ?? 'aria'
	/**
	 * Наборы ядра на корне (`TRootSpec.sets`): слой раскладчика и выход
	 * состояния, из которого он берётся.
	 */
	const rootSets: readonly (readonly [TRootSet, string])[] = (spec.root?.sets ?? ROOT_SETS).map(
		(set) => [set, set === 'aria' ? ariaOutput : set],
	)
	/** Свои атрибуты элемента: имя атрибута → имя свойства (`ISoldyElementSpec.attributes`). */
	const own: ReadonlyMap<string, string> = new Map(
		(spec.attributes ?? []).map((name) => [toAttributeName(name), name]),
	)
	/** Имя стиль-выхода компонента (`TRootSpec.style`); нет — стиль только от плагина. */
	const styleOutput = spec.root?.style
	/** Стоит ли корень по месту в коллекции (`TRootSpec.order`). */
	const ordered = spec.root?.order === true
	/** Выход, без которого корень скрыт (`TRootSpec.shownBy`); нет — не прячет. */
	const shownBy = spec.root?.shownBy
	/** Прячет ли видимость корень (`TRootSpec.hides`). */
	const hides = spec.root?.hides ?? true
	/** Имена выходов слоя (`TRootSpec.teleport`); нет — корень в слой не уезжает. */
	const layer = spec.root?.teleport

	class TSoldyElement extends Native implements ISoldyElement<TInstance, TFacade, TOwnerFacade> {
		static get observedAttributes(): string[] {
			return [...attributes.keys(), ...own.keys()]
		}

		private _binding?: TBinding<TInstance, TFacade, TOutputs, TOwnerFacade>

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
		/** Подключение отложено — до разбора документа, регистрации или чужого подключения (см. шапку). */
		private _deferred = false

		/**
		 * Корень компонента — узел, на который база кладёт то, что пишет ядро, и
		 * который связан с `TElementPlugin`: сам элемент, а у обёрнутого корня
		 * (`TRootSpec.wrapped`) — узел шаблона внутри него, с построения.
		 */
		private _root: HTMLElement = this

		/**
		 * Внешний узел компонента — на него ложится скрытие: сам элемент, и у окна
		 * таблицы тоже, а у обёрнутого корня, который уезжает в слой, — корень:
		 * элемент со светом остаётся на месте и на виду (`TRootSpec.wrapped`).
		 */
		private _outer: HTMLElement = this

		/** Память раскладки корня: что поставила база (см. `root-attributes.ts`). */
		private _appliedClasses: TAppliedClasses = new Set()
		private _appliedStyles: TAppliedStyles = new Map()
		/** Память скрытия внешнего узла (`_outer`). */
		private _hiddenDisplay: THiddenDisplay = undefined

		/** Контекст привязок шаблона — живой вид элемента (`_viewOf`). */
		private readonly _view: ITemplateContext<TInstance, TFacade, TOutputs, TOwnerFacade> =
			this._viewOf()

		/** Телепорт корня слоя (`TRootSpec.teleport`) — заводит его построение. */
		private _teleport?: TTeleport
		/** Корень на своём месте: у слоя — в цели или на месте; без цели — нет. */
		private _placed = true
		/** Спутник корня слоя (`TTemplateParts.companion`): прячется вместе с корнем. */
		private _companion: HTMLElement | null = null
		/** Память скрытия спутника. */
		private _companionDisplay: THiddenDisplay = undefined

		constructor(...args: ConstructorParameters<TNativeElementClass>) {
			super(...args)
			// Элемент soldy — хозяин места панелей, чей якорь в нём (`teleport.ts`)
			markSoldyElement(this)
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

			// Пришло, пока подключается другой элемент soldy, — сразу после него
			// (ожидание, см. шапку): его сборка ещё не опустила движок, а деталь
			// ещё не получила свет
			if (isConnecting()) {
				this._deferred = true
				wait(this._resume)

				return
			}

			connecting(() => this._connect())
		}

		disconnectedCallback(): void {
			// Перенос силами базы — не отключение: элемент снова в документе, и
			// связка остаётся (см. шапку)
			if (isRelocating(this)) return

			this._connected = false
			this._binding?.destroy()
			this._binding = undefined
			// Увезённый корень сняли или переставили: якорь уходит с места
			// (`TTeleport.release`)
			this._teleport?.release()

			// Снят со страницы — панели его места уходят за ним сразу. Переставлен
			// — вернутся при подключении, после его новой сборки (см. шапку)
			if (!this.isConnected) TTeleport.recall(this)
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
		 * Отложенное подключение — после разбора документа, микрозадачей позже
		 * регистрации или в свою очередь после чужого подключения, если элемент
		 * ещё в документе.
		 */
		private readonly _resume = (): void => {
			this._deferred = false

			if (this.isConnected) this.connectedCallback()
		}

		/**
		 * Подключение: структура — один раз, перестановка в DOM её не пересоздаёт;
		 * связка, узел и полная отрисовка — на каждое.
		 */
		private _connect(): void {
			/** Структура уже построена: подключение повторное, место пересобрано. */
			const again = this._light !== null

			this._connected = true

			if (!again) {
				this._readAttributes()
				this._build()
			}

			this._assemble().bindElement(this._root)

			// Панели места — к якорям: соберутся следом, с новым лифтом, а пункты
			// из данных, которые строит первая отрисовка, встанут в очередь за
			// панелью (см. шапку)
			if (again) TTeleport.recall(this)

			this._flush(true)
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
		 * элемент, поверх — записанное без связки, и тег корня. Снятое без связки
		 * (`undefined`) сборка не донесла бы: она пропускает `undefined` и вернуть
		 * проп к умолчанию не может. Поэтому у такого пропа в сборку уходит прежнее
		 * значение, а снятие доходит следом записью в связку — как снятие атрибута у
		 * подключённого элемента.
		 */
		private _assemble(): TBinding<TInstance, TFacade, TOutputs, TOwnerFacade> {
			const offline = this._offline
			const props: Record<string, unknown> = {}

			for (const name of this._given) props[name] = this._values.get(name)

			for (const [name, value] of offline) {
				if (value !== undefined) props[name] = value
			}

			props['tag'] = this._root.localName

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
		 *
		 * Свет известен раньше, чем шаблон строит структуру: обёртку слота шаблон
		 * строит, только когда в неё есть что положить, а контекст, который он
		 * получает, видит заданные слоты уже при построении.
		 */
		private _build(): void {
			const groups = groupBySlot(Array.from(this.childNodes))
			const light = new Map<string, ChildNode[]>()

			// Слот без содержимого (`isContent`) не задан — см. `_distribute`
			for (const [name, nodes] of groups) {
				if (nodes.some(isContent)) light.set(name, nodes)
			}

			this._light = light

			const parts = spec.template.create(this, (name) => light.has(name), this._view)

			// `id` поля — пропом первой сборки, с корня снят; остальное — полю,
			// если корень с полем (см. шапку)
			if (fieldId) this._takeFieldId()
			if (control) this._handOver(this._controlOf(parts.control), ROOT_ONLY)
			if (wrapped) this._root = this._wrappedRoot(parts.root)

			// Обёрнутый корень в слое — внешний узел: атрибуты разметки и скрытие —
			// его, элемент остаётся местом (см. `TRootSpec.wrapped`)
			if (wrapped && layer) {
				this._handOver(this._root, PLACE_ONLY)
				this._outer = this._root
			}

			this._teleport = this._teleportOf(parts.companion)

			// Слоты не наследуются: слота по умолчанию может не быть вовсе
			// (ProgressSpinner), и узлом содержимого тогда остаётся корень
			const fallback = targetOf(parts.slots, DEFAULT_SLOT)

			this._content = fallback?.mode === 'append' ? fallback.node : this
			this._targets = parts.slots
			this._distribute(groups)
		}

		/**
		 * `id` поля, которое его объявляет, — пропом первой сборки, с корня снят:
		 * на поле его пишет шаблон из состояния (см. шапку). Колбэка снятие не
		 * вызывает: атрибут `id` такой элемент не наблюдает.
		 */
		private _takeFieldId(): void {
			const id = this.getAttribute(CONTROL_ID)

			if (id === null) return

			this._write(CONTROL_ID, id)
			this.removeAttribute(CONTROL_ID)
		}

		/**
		 * Поле корня, которое построил шаблон (`TRootSpec.control`). Не построил —
		 * описание корня с шаблоном разошлось, и атрибуты разметки нести некуда.
		 */
		private _controlOf(field: HTMLElement | undefined): HTMLElement {
			if (!field) {
				throw new Error('[soldy] Описание корня объявляет поле, а шаблон его не построил')
			}

			return field
		}

		/**
		 * Статические атрибуты разметки элемента — узлу, который их несёт (см.
		 * шапку): полю корня, а у обёрнутого корня в слое — корню. На элементе
		 * остаются `keep` — у поля `class`, `style`, `is`, `slot`, у корня в слое
		 * только `is` и `slot`, — атрибуты-входы пропов и свои атрибуты элемента;
		 * `id` поля, которое его объявляет, база к этому времени уже взяла пропом
		 * (`_takeFieldId`). Колбэков снятие не вызывает: ни один из этих
		 * атрибутов элемент не наблюдает.
		 */
		private _handOver(target: HTMLElement, keep: ReadonlySet<string>): void {
			for (const name of this.getAttributeNames()) {
				if (keep.has(name) || attributes.has(name) || own.has(name)) continue

				target.setAttribute(name, this.getAttribute(name) ?? '')
				this.removeAttribute(name)
			}
		}

		/**
		 * Телепорт корня слоя (`TRootSpec.teleport`) со спутником, который
		 * построил шаблон. Спутник без слоя — описание корня с шаблоном разошлось:
		 * ставить его рядом с корнем незачем, а прятать и увозить — некому.
		 */
		private _teleportOf(companion: HTMLElement | undefined): TTeleport | undefined {
			if (layer === undefined) {
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

		/**
		 * Корень внутри элемента-обёртки — узел, который построил шаблон
		 * (`TRootSpec.wrapped`). Не построил — описание корня с шаблоном
		 * разошлось, и раскладывать ядро некуда.
		 */
		private _wrappedRoot(root: HTMLElement | undefined): HTMLElement {
			if (!root) {
				throw new Error(
					'[soldy] Описание корня объявляет обёртку, а шаблон корня не построил',
				)
			}

			return root
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
		 * подключение приходит уже на новом месте, в документе, под провайдером,
		 * и ждёт конца подключения контейнера (ожидание). Слот, который выводит
		 * привязка (`showSlot`), раскладывается так же: первая раскладка связки
		 * его оставит или снимет. Точка, которая ведёт в слот детали, назначает
		 * узлу этот слот (`place`).
		 *
		 * Образец (`sample`) не выводится: его узлы уходят из документа и
		 * остаются в свете — копию шаблон берёт у контекста.
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

				if (!nodes) continue

				if (target.mode === 'sample') {
					for (const node of nodes) node.remove()

					continue
				}

				relocate(nodes, () => {
					for (const node of nodes) place(node, target)
				})
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
		 * задан, не объявлен или образец — делать нечего; уже так — тоже.
		 */
		private _showSlot(name: string, shown: boolean): void {
			const nodes = this._light?.get(name)
			const target = targetOf(this._targets, name)

			if (!nodes || !target || target.mode === 'sample' || this._hidden.has(name) !== shown) {
				return
			}

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

		/**
		 * Узлы заданного слота — `slotted` контекста шаблона (см. шапку): те
		 * самые узлы света в точке слота, копией списка — свой свет база ведёт
		 * сама. Слот не задан, не объявлен или образец — пусто.
		 */
		private _slotted(name: string): readonly ChildNode[] {
			const nodes = this._light?.get(name)
			const target = targetOf(this._targets, name)

			if (!nodes || !target || target.mode === 'sample') return []

			return [...nodes]
		}

		/** Копия образца — `sample` контекста шаблона (см. шапку). */
		private _sample(name: string): DocumentFragment | null {
			const nodes = this._light?.get(name)

			if (!nodes || targetOf(this._targets, name)?.mode !== 'sample') return null

			const copy = this.ownerDocument.createDocumentFragment()

			for (const node of nodes) copy.append(copyOf(node, this.ownerDocument))

			return copy
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
		 * жизни: узел содержимого, состояние (с выходами плагинов), инстанс и
		 * фасад он отдаёт в момент обращения. Поэтому обработчик, который шаблон
		 * завёл на одной связке и который запомнил контекст, после перестановки
		 * зовёт инстанс и фасад новой связки, а не прежней.
		 */
		private _viewOf(): ITemplateContext<TInstance, TFacade, TOutputs, TOwnerFacade> {
			const content = (): HTMLElement => this._content
			const state = (): TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade> =>
				this._binding?.state ?? {}
			const instance = (): TInstance | undefined => this.ctrl
			const facade = (): TFacade | undefined => this._binding?.facade

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
				get facade() {
					return facade()
				},
				hasSlot: (name) => this._light?.has(name) ?? false,
				slotted: (name) => this._slotted(name),
				showSlot: (name, shown) => this._showSlot(name, shown),
				sample: (name) => this._sample(name),
			}
		}

		private _flush(full = false): void {
			// Состояние — по именам: база не знает инстанса компонента, а у
			// невизуального нет ни классов, ни наборов, ни видимости
			const snapshot: TStateSnapshot = this.state
			const root = this._root
			// Имена забираются до раскладки: изменение, пришедшее во время неё (через
			// обратную запись атрибута-входа `disabled`), дождётся своего флаша, а не
			// пропадёт
			const dirty = new Set(this._dirty)
			const changed = (name: string) => full || dirty.has(name)

			this._dirty.clear()

			if (changed('classes')) {
				this._appliedClasses = applyClasses(
					root,
					classesOf(snapshot['classes']),
					this._appliedClasses,
				)
			}

			// Наборы корня — нижние слои его раскладчика: память у слоёв одна, и
			// снятие записи в одном не уносит чужие. Входы пропов называют они.
			// Слой `aria` — из выхода, который назвало описание корня
			for (const [layer, output] of rootSets) {
				if (changed(output)) {
					TElementAttributes.of(root).set(layer, setOf(snapshot[output]), inputs)
				}
			}

			// Снизу выход плагина раскладки, поверх — стиль-выход компонента и место
			// элемента коллекции. Их имена — не свойства инстанса, поэтому состояние
			// читается по именам
			if (
				changed('layout_styles') ||
				(styleOutput !== undefined && changed(styleOutput)) ||
				(ordered && changed('order'))
			) {
				this._appliedStyles = applyStyles(
					root,
					stylesOf(
						snapshot['layout_styles'],
						styleOutput === undefined ? undefined : snapshot[styleOutput],
						ordered ? orderOf(snapshot['order']) : undefined,
					),
					this._appliedStyles,
				)
			}

			// Слой — в цель или на место: на первой раскладке связки и на смене
			// цели или «на месте». Корень потребителя или корень в обёртке, и
			// переносит его база — вместе со спутником
			const teleport = this._teleport
			const placing =
				layer !== undefined &&
				teleport !== undefined &&
				(full ||
					changed(layer.target) ||
					(layer.contained !== undefined && changed(layer.contained)))

			if (placing) this._placed = teleport.place(placeOf(snapshot, layer))

			// Скрытие — поверх стиля: `display: none` не перекрывает ни раскладка,
			// ни потребитель. Прячут корень `rendered` и `visible`, если видимость
			// его прячет, выход, без которого корня нет (`shownBy`), и слой без
			// цели: корень на месте, а места у панели нет. Прячется внешний узел
			// компонента: элемент, и у окна таблицы тоже — спрятано окно, спрятан и
			// корень в нём, — а у корня в слое — сам корень. Спутник — вместе с ним
			if (
				changed('rendered') ||
				changed('visible') ||
				placing ||
				(shownBy !== undefined && changed(shownBy))
			) {
				const unseen =
					hides && (snapshot['rendered'] === false || snapshot['visible'] === false)
				const absent = shownBy !== undefined && snapshot[shownBy] !== true
				const hidden = unseen || absent || !this._placed

				this._hiddenDisplay = applyHidden(this._outer, hidden, this._hiddenDisplay)

				if (this._companion) {
					this._companionDisplay = applyHidden(
						this._companion,
						hidden,
						this._companionDisplay,
					)
				}
			}

			for (const binding of spec.template.bindings) {
				if (full || binding.props.some(changed)) binding.apply(this._view)
			}
		}

		/**
		 * Свойства пропов на прототипе — JS-путь `el.text = 'Click'`. Атрибуты
		 * покрывают только примитивы, поэтому свойства — единственный способ
		 * передать объект или готовый инстанс. Свойства — у пропов обоих
		 * дескрипторов: своего и фасада коллекции (`el.items`, `el.active`).
		 * Пропускаются `ctrl` (своя пара выше), пропы `HOST_PROPS` и свойства,
		 * которые у элемента уже есть по тегу: нативное свойство остаётся
		 * нативным (см. шапку).
		 *
		 * Свойства своих атрибутов — следом, отражением атрибута: значение
		 * хранит он сам (см. шапку). Имя, которое уже занято — пропом (его
		 * атрибутом или свойством), `HOST_PROPS`, классом элемента или нативным
		 * элементом, — ошибка описания, а не повод перекрыть чужое.
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
