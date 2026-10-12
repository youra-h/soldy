/**
 * Раскладка корня: класс, стиль и атрибуты, которые сходятся на корне компонента.
 *
 * Во Vue это привязки шаблона — `:class="classes"`, `:style` (выход плагина
 * раскладки `layout_styles` или стиль-выход самого компонента, как
 * `fractionStyle` у ProgressSpinner), `v-show="visible"` и `v-bind` наборов
 * ядра, — а слияние с атрибутами потребителя Vue делает сам. Solid атрибутов
 * компоненту не наследует: сливать приходится разметке, и одна и та же склейка
 * расходилась бы по компонентам. Поэтому она здесь, одна на все, — как
 * `toRootProps` у React и Svelte.
 *
 * Порядок слоёв:
 * - атрибуты — наборы ядра (`attrs`, `aria`, `dataset`), поверх них атрибуты
 *   потребителя, как у Vue, где атрибуты снаружи ложатся на корень последними:
 *   `tabindex="-1"` строки списка перекрывает `tabindex="0"`, который кнопка на
 *   `div` ставит себе сама. Имена HTML (`tabindex`) и `null` («атрибута нет»)
 *   Solid понимает сам — переводить их, как React, не нужно;
 * - `class` — классы ядра, затем класс потребителя;
 * - `style` — выход плагина раскладки (`layout_styles`), поверх него
 *   стиль-выход самого компонента и место элемента коллекции (`order`); поверх
 *   них стиль потребителя, поверх всего `display: none` скрытого корня:
 *   скрытие не перекрывают ни раскладка, ни потребитель — как у `v-show`.
 *
 * Стиль — объект с именами как в CSS (`z-index`, `--*`): их и пишут плагины и
 * ядро, и их же ждёт Solid. Объект он ставит по свойству — сменившиеся,
 * снимает пропавшие, — и не трогает того, что плагины пишут в узел сами
 * (`--s-swipe-offset` смахиваемой панели). Поэтому и пустой стиль — объект, а
 * не `undefined`: `undefined` Solid понимает как «атрибута нет» и снял бы
 * атрибут целиком вместе с чужими свойствами. Пустое значение (`width: ''` у
 * иконки без размера) свойства не задаёт: сервер напечатал бы его как
 * `width:`. Стиль потребителя строкой разобрать на свойства негде — на
 * сервере нет документа, — и тогда слои склеиваются текстом, а из одноимённых
 * свойств браузер берёт последнее. Такой стиль Solid пишет целиком, и
 * свойства, записанные в узел мимо разметки, его смену не переживают: их
 * сохраняет только стиль объектом.
 *
 * `ref` адаптера в раскладку не входит: компонент ставит его корню сам,
 * последним, после атрибутов (`<Dynamic {...root()} ref={binding.ref}>`).
 * Атрибуты корня — мемо, и `ref` из него Solid перечитывал бы на каждую смену
 * любого атрибута, отвязывая и заново привязывая узел к `TElementPlugin`.
 * Последним он стоит по той же причине, что у React: `ref` потребителя из его
 * атрибутов (`forward`) не должен выбить привязку корня — не было бы
 * `element:ready`.
 *
 * У поля (Input, CheckBox, Switch) атрибуты потребителя делятся между двумя
 * элементами, как `useSplitAttrs` у Vue и `toControlAttrs` у React и Svelte:
 * класс и стиль — корню (`toRootForward`), всё остальное — его `<input>`
 * (`toControlAttrs`), поверх `aria` поля. Остальное — это и обработчики
 * событий, и `aria-*`, и `data-*`, и `ref` потребителя: поведение, которое он
 * вешает на поле, — подсказка, фокус по `ref` — встаёт на сам `<input>`.
 */

import { createMemo, type Accessor, type JSX } from 'solid-js'
import type { TAttributesMap } from '@soldy-ui/core'

/** Стиль, как его отдают плагины и ядро: имена — как в CSS (`z-index`, `--*`). */
export type TRootStyle = Readonly<Record<string, string | number>>

/** Что корню нужно из состояния компонента. */
export type TRootState = {
	/** Снимок классов ядра. */
	readonly classes?: readonly string[]
	/** Выход плагина раскладки. Плагин раскладки есть не у всех. */
	readonly layout_styles?: TRootStyle
	/**
	 * Место элемента коллекции (`order` фасада): ряд — флексбокс, и элемент
	 * встаёт по номеру в коллекции, а не по месту в разметке. Ключа нет — у
	 * компонента своего места нет.
	 */
	readonly order?: number
	/**
	 * `false` прячет корень. Ключа нет — корень виден всегда: у Skeleton
	 * видимость прячет заглушку, а не корень с содержимым.
	 */
	readonly visible?: boolean
}

/** Что корню приходит от потребителя: его класс и стиль — объект свойств или строка. */
export type TRootForward = {
	readonly class?: string
	readonly style?: JSX.CSSProperties | string
}

export type TRootLayout = {
	class: string
	/** Объект свойств; строка — только когда строкой пришёл стиль потребителя. */
	style: TRootStyle | string
}

/** Атрибуты корня целиком: наборы ядра, атрибуты потребителя и раскладка. */
export type TRootProps = Record<string, unknown> & TRootLayout

/** Из чего мемо раскладки собирает атрибуты корня — аргументы `toRootProps`. */
export type TRootSource = {
	/** Что раскладке нужно из состояния компонента. */
	readonly state: TRootState
	/** Наборы ядра — в том порядке, в каком их кладёт Vue. */
	readonly sets: readonly (TAttributesMap | undefined)[]
	/** Атрибуты корня от потребителя — то, что не съела связка (`forwardProps`). */
	readonly forward: TRootForward
	/** Стиль-выход компонента (`fractionStyle`); нет — у компонента своего стиля нет. */
	readonly style?: TRootStyle
}

const HIDDEN: TRootStyle = { display: 'none' }

/** Свойство стиля с непустым значением. */
type TDeclaration = readonly [name: string, value: string | number]

/**
 * Свойства слоя стиля без пустых: `''` и отсутствующее значение свойства не
 * задают. Слой — объект стиля плагина, ядра или потребителя (`CSSProperties`
 * Solid — интерфейс, и словарём его тип не описать), поэтому значение
 * проверяется, а не берётся на веру.
 */
function declarationsOf(styles: object | undefined): TDeclaration[] {
	const declarations: TDeclaration[] = []

	for (const [name, value] of Object.entries(styles ?? {})) {
		if (typeof value === 'number' || (typeof value === 'string' && value !== '')) {
			declarations.push([name, value])
		}
	}

	return declarations
}

/** Свойства — текстом атрибута: так склеиваются слои вокруг строки потребителя. */
function toText(declarations: readonly TDeclaration[]): string[] {
	return declarations.map(([name, value]) => `${name}: ${value}`)
}

/**
 * Класс и стиль корня в порядке слоёв из шапки файла.
 *
 * `style` — стиль-выход самого компонента: стиль, который считает ядро
 * (`fractionStyle` у ProgressSpinner). Имя выхода у каждого компонента своё,
 * поэтому его называет разметка, как и наборы ядра в `toRootProps`, а не
 * раскладка — по имени из состояния. Нет его — у компонента своего стиля нет.
 */
export function toRootLayout(
	state: TRootState,
	forward: TRootForward,
	style?: TRootStyle,
): TRootLayout {
	const below = [
		...declarationsOf(state.layout_styles),
		...declarationsOf(style),
		...declarationsOf(state.order !== undefined ? { order: state.order } : undefined),
	]
	const above = declarationsOf(state.visible === false ? HIDDEN : undefined)
	const className = [...(state.classes ?? []), forward.class].filter(Boolean).join(' ')
	const consumer = forward.style

	if (typeof consumer === 'string' && consumer !== '') {
		return {
			class: className,
			style: [...toText(below), consumer, ...toText(above)].join('; '),
		}
	}

	const own = typeof consumer === 'object' ? declarationsOf(consumer) : []

	return { class: className, style: Object.fromEntries([...below, ...own, ...above]) }
}

/**
 * Атрибуты корня в одном порядке для всех компонентов: наборы ядра `sets` — в
 * том порядке, в каком их кладёт Vue, — поверх них атрибуты потребителя
 * `forward`, класс и стиль — раскладкой корня (`toRootLayout`, туда же
 * стиль-выход компонента `style`).
 *
 * `forward` — то, что компонент кладёт на корень из не съеденного им: пропсы,
 * которые не съела связка (`forwardProps`), — среди них и `ref` потребителя.
 * Его перекрывает `ref` адаптера, который компонент ставит после атрибутов
 * (см. шапку файла).
 */
export function toRootProps(
	state: TRootState,
	sets: readonly (TAttributesMap | undefined)[],
	forward: TRootForward,
	style?: TRootStyle,
): TRootProps {
	const attributes: Record<string, unknown> = {}

	for (const set of sets) Object.assign(attributes, set)

	return { ...attributes, ...forward, ...toRootLayout(state, forward, style) }
}

/**
 * Атрибуты корня аксессором-мемо — то, что компонент спредит на корень:
 * `<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>`.
 *
 * Тело компонента Solid выполняется один раз, а спред читает атрибуты корня
 * по одному — на каждую отрисовку и каждую смену. Мемо считает раскладку один
 * раз на смену того, что прочёл `read`: наборов, состояния или атрибутов
 * потребителя, — и все чтения спреда идут из готового объекта.
 */
export function createRootProps(read: () => TRootSource): Accessor<TRootProps> {
	return createMemo(() => {
		const { state, sets, forward, style } = read()

		return toRootProps(state, sets, forward, style)
	})
}

/** Класс и стиль потребителя — то, что из его атрибутов остаётся корню поля. */
export function toRootForward(forward: TRootForward): TRootForward {
	return { class: forward.class, style: forward.style }
}

/**
 * Атрибуты вложенного контрола: пропсы, которые компонент не съел, без класса
 * и стиля — те сливаются на корне (`toRootForward`). Так поле раздаёт атрибуты
 * потребителя двум элементам: обёртке — вид, `<input>` — всё остальное,
 * события, `aria-*`, `data-*` и `ref`. Аналог `useSplitAttrs` у Vue и
 * `toControlAttrs` у React и Svelte.
 *
 * Параметр типа — атрибуты компонента (`TDomAttributes` с `TFieldAttributes`),
 * а не весь его набор пропсов: `forwardProps` типизирован пропсами целиком, а
 * входов дескриптора в нём нет — их съела связка. Остаток ложится на `<input>`
 * спредом, и его тип сверяется с атрибутами `<input>`.
 */
export function toControlAttrs<TAttributes extends TRootForward>(
	forward: Partial<TAttributes>,
): Omit<Partial<TAttributes>, keyof TRootForward> {
	const { class: _class, style: _style, ...control } = forward

	return control
}
