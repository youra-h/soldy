import { inputBinding, type DirectiveWithBindings, type Type } from '@angular/core'
import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
import {
	RoleIconDirective,
	TAccordionComponent,
	TAccordionItemComponent,
	TButtonComponent,
	TCheckBoxComponent,
	TIconComponent,
	TInputComponent,
	TLabelComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TProgressSpinnerComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TSkeletonComponent,
	TSwitchComponent,
	TTabsComponent,
	TTabsContentComponent,
	TTabsItemComponent,
} from '@soldy-ui/angular'

/** Пропсы компонента — именами разметки. */
export type TProps = Readonly<Record<string, unknown>>

/**
 * Часть содержимого — компонент адаптера на своём элементе, как его пишут в
 * разметке владельца: `<so-list-box-item>`, `<label so-radio-group-item>`.
 * Пропсы части задаёт превью, строка страницы их не правит.
 */
export type TPart = {
	/** Компонент адаптера. */
	readonly component: Type<object>
	/**
	 * Элемент части — тег, которым её пишут в разметке. Владелец получает его
	 * проекцией раньше, чем на нём соберётся часть, поэтому элемент строит
	 * хост, а не Angular.
	 */
	readonly element: () => Element
	/** Пропсы части. */
	readonly props?: TProps
	/**
	 * Слот владельца: часть ложится в его `<ng-content select="[slot=…]">`, как
	 * `<div so-tabs-content slot="content">`. Нет — в основную проекцию.
	 */
	readonly slot?: string
	/** Своё содержимое части — части и разметка. */
	readonly content?: readonly TContent[]
}

/**
 * Содержимое компонента: часть или разметка без компонента — текст, блок с
 * отступом. Разметку строит функция: у каждой отрисовки свои узлы.
 */
export type TContent = TPart | (() => Node)

/**
 * Обёртка вокруг компонента превью — компонент адаптера со своими пропсами, а
 * компонент превью — в её основной проекции, как CheckBox в Label.
 */
export type TWrapper = {
	readonly component: Type<object>
	readonly props?: TProps
}

/** Что есть у любого превью — с обёрткой и без неё. */
type TPreviewBase = {
	/** Компонент адаптера: его входам уходят пропсы строки, его выходы слушает хост. */
	readonly component: Type<object>
	/** Пропсы превью — под пропсами строки. */
	readonly props?: TProps
	/** Директивы на корне — как атрибуты директив рядом с селектором в разметке. */
	readonly directives?: readonly DirectiveWithBindings<unknown>[]
	/** Содержимое компонента — части коллекции, контрол подписи, текст. */
	readonly content?: readonly TContent[]
}

/**
 * Как рисовать компонент на стенде — в Angular.
 *
 * Та же карта, что у хоста Vue (`hosts/vue/previews.ts`), и с теми же ключами
 * — идентификаторами реестра. Разметки, в которую разложить пропсы строки, у
 * Angular нет: привязки шаблона перечисляются поимённо, а у строки проп свой.
 * Поэтому превью — не шаблон, а описание: компонент адаптера, пропсы превью,
 * обёртка вокруг него и его содержимое. Строит всё это хост
 * (`createComponent`), а пропсы — и превью, и строки поверх них, как атрибуты
 * перед `{...bind}` у React, — отдаёт входам компонента по имени. Превью то же
 * самое, что у Vue и React, чтобы колонки фреймворков можно было сравнивать
 * глазами.
 *
 * Корень компонента — сам элемент (`<button so-button>`), и тег его — тег
 * первого селектора: так Angular строит хост сам. Входа `tag` нет, как у
 * Web Components: тег — у элемента, и строка `tag` его не меняет.
 *
 * Обёртке и частям пропсы строки не уходят: их пишет превью, как разметка
 * соседей пишет `<Label text="Согласен">` и `<ListBox.Item {...item} />`.
 *
 * Чего у адаптера нет, того нет и в карте. Слоёв и `frame` здесь тоже нет: во
 * Vue это ComponentView с чужими пропами, а у компонента Angular чужого входа
 * нет вовсе.
 */
export type TPreview = TPreviewBase &
	(
		| {
				readonly wrapper?: undefined
				/**
				 * Свой элемент корня, когда тег первого селектора не годится:
				 * рисунок иконки по роли ложится только на `<svg>`.
				 */
				readonly element?: () => Element
		  }
		| {
				/** Обёртка вокруг компонента. */
				readonly wrapper: TWrapper
				/**
				 * Элемент компонента в проекции обёртки — тег, которым его пишут в
				 * разметке. Обёртка получает его раньше, чем на нём соберётся
				 * компонент, поэтому элемент строит хост.
				 */
				readonly element: () => Element
		  }
	)

/** Пространство имён SVG: в нём документ строит `<svg>` иконки. */
const SVG = 'http://www.w3.org/2000/svg'

/** Элемент по тегу — как его пишут в разметке. */
const tag = (name: string) => (): Element => document.createElement(name)

/** Текст в содержимом — подпись радио. */
const text = (value: string) => (): Node => document.createTextNode(value)

/** Блок содержимого с отступом — панель таба, содержимое секции, как у соседей. */
const block = (padding: string, value: string) => (): Node => {
	const node = document.createElement('div')

	node.style.padding = padding
	node.textContent = value

	return node
}

/** Содержимое коллекций — из общего манифеста, как у Vue и React. */
const ITEMS = COLLECTION_ITEMS

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — пропом `text`, а не содержимым: заданный слот перекрывает проп,
	// и строка `text` на странице свойств не меняла бы ничего видимого
	button: { component: TButtonComponent, props: { text: 'Кнопка' } },

	input: { component: TInputComponent, props: { placeholder: 'Введите текст' } },

	// Текста у чекбокса и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': {
		component: TCheckBoxComponent,
		element: tag('so-check-box'),
		wrapper: { component: TLabelComponent, props: { text: 'Согласен' } },
	},

	switch: {
		component: TSwitchComponent,
		element: tag('so-switch'),
		wrapper: { component: TLabelComponent, props: { text: 'Включено' } },
	},

	// Подпись — пропом `text`, контрол — содержимым. Строки страницы правят саму
	// подпись: сторону, размер текста, вариант
	label: {
		component: TLabelComponent,
		props: { text: 'Согласен' },
		content: [{ component: TCheckBoxComponent, element: tag('so-check-box') }],
	},

	// Подпись — содержимым: текста у радио нет, оно голый контрол, как CheckBox.
	// Корень радио — подпись, `<label so-radio-group-item>`
	'radio-group': {
		component: TRadioGroupComponent,
		content: ITEMS.map((item) => ({
			component: TRadioGroupItemComponent,
			element: tag('label'),
			props: { value: item.value },
			content: [text(item.text)],
		})),
	},

	'list-box': {
		component: TListBoxComponent,
		content: ITEMS.map((item) => ({
			component: TListBoxItemComponent,
			element: tag('so-list-box-item'),
			props: { ...item },
		})),
	},

	// Первый таб активен сразу — иначе ни одна панель не смонтируется. Панели —
	// слотом `content`, вне списка табов
	tabs: {
		component: TTabsComponent,
		content: [
			...ITEMS.map((item, index) => ({
				component: TTabsItemComponent,
				element: tag('so-tabs-item'),
				props: { active: index === 0, ...item },
			})),
			...ITEMS.map((item) => ({
				component: TTabsContentComponent,
				element: tag('div'),
				slot: 'content',
				props: { value: item.value },
				content: [block('12px', `Панель «${item.text}»`)],
			})),
		],
	},

	accordion: {
		component: TAccordionComponent,
		content: ITEMS.map((item) => ({
			component: TAccordionItemComponent,
			element: tag('so-accordion-item'),
			props: { ...item },
			content: [block('4px 0', `Содержимое «${item.text}»`)],
		})),
	},

	// `<svg so-icon so-role-icon="arrowDown">`: глиф роли кладёт на `<svg>`
	// директива адаптера, а тег первого селектора Icon — `span`
	icon: {
		component: TIconComponent,
		element: () => document.createElementNS(SVG, 'svg'),
		directives: [
			{
				type: RoleIconDirective,
				bindings: [inputBinding('so-role-icon', () => 'arrowDown')],
			},
		],
	},

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`. Имени без видимой подписи у него нет, превью
	// даёт его пропом
	'progress-spinner': { component: TProgressSpinnerComponent, props: { aria_label: 'Загрузка' } },

	skeleton: { component: TSkeletonComponent, props: { width: 160, height: 16 } },
}
