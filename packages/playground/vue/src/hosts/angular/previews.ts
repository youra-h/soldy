import { inputBinding, type DirectiveWithBindings, type Type } from '@angular/core'
import {
	COLLECTION_ITEMS,
	COLLECTION_MANY_ITEMS,
	TABLE_COLUMNS,
	TABLE_MANY_ROWS,
	TABLE_ROWS,
	TABLE_SCROLL_ROWS,
} from '@soldy-ui/playground-shared'
import {
	RoleIconDirective,
	TAccordionComponent,
	TAccordionItemComponent,
	TButtonComponent,
	TCheckBoxComponent,
	TFieldComponent,
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
	TTableComponent,
	TTabsComponent,
	TTabsContentComponent,
	TTabsItemComponent,
	TVirtualComponent,
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
 * Разметка без компонента со своим содержимым — частями и разметкой: ряд,
 * окно прокрутки вокруг списка и таблицы в окне `Virtual`. Элемент строит
 * функция, как и разметку без содержимого, а содержимое ложится в него
 * детьми, по порядку. Части в ней собираются, как части её владельца: с его
 * инжектором и после него.
 */
export type TMarkup = {
	/** Элемент разметки — у каждой отрисовки свой. */
	readonly markup: () => Element
	/** Содержимое элемента — части и разметка. */
	readonly content: readonly TContent[]
}

/**
 * Содержимое компонента: часть, разметка со своим содержимым или разметка без
 * компонента — текст, блок с отступом. Разметку строит функция: у каждой
 * отрисовки свои узлы.
 */
export type TContent = TPart | TMarkup | (() => Node)

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
	/**
	 * Компонент адаптера: его входам уходят пропсы оболочки — пропсы превью и
	 * строки, — его выходы слушает хост.
	 */
	readonly component: Type<object>
	/** Директивы на корне — как атрибуты директив рядом с селектором в разметке. */
	readonly directives?: readonly DirectiveWithBindings<unknown>[]
	/**
	 * Содержимое компонента — части коллекции, контрол подписи, текст. Функция
	 * пропсов оболочки — когда содержимое от них зависит: список, состав которого
	 * пришёл данными (`items` блока групп страницы), рисуется без частей
	 * разметки — они заменили бы данные. Содержимое строится, когда превью
	 * ставится, а смена пропсов его не перестраивает.
	 */
	readonly content?: readonly TContent[] | ((props: TProps) => readonly TContent[])
	/**
	 * Данные превью для входов компонента, которых нет в пропсах превью
	 * оболочки: строки и колонки таблицы, как `items` и `columns` в превью Vue
	 * и React. Функция пропсов оболочки: с закреплённой шапкой у таблицы свои
	 * строки. Пропсы оболочки ложатся поверх, и строка страницы правит то, что
	 * правит.
	 */
	readonly props?: (props: TProps) => TProps
}

/**
 * Как рисовать компонент на стенде — в Angular.
 *
 * Та же карта, что у хоста Vue (`hosts/vue/previews.ts`), и с теми же ключами
 * — идентификаторами реестра. Разметки, в которую разложить пропсы строки, у
 * Angular нет: привязки шаблона перечисляются поимённо, а у строки проп свой.
 * Поэтому превью — не шаблон, а описание: компонент адаптера, обёртка вокруг
 * него и его содержимое. Строит всё это хост (`createComponent`), а пропсы,
 * которые отдала оболочка, — входам компонента по имени. Превью то же самое,
 * что у Vue и React, чтобы колонки фреймворков можно было сравнивать глазами.
 *
 * Пропсов компонента в описании нет: подпись кнопки, плейсхолдер поля —
 * данные, одни на все хосты (`PREVIEW_PROPS` в общем пакете), и отдаёт их
 * оболочка вместе с пропсами строки. Своё у описания — только данные, которые
 * превью соседей тоже пишет само (`props`: строки и колонки таблицы).
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
				readonly frame?: undefined
				/**
				 * Свой элемент корня, когда тег первого селектора не годится:
				 * рисунок иконки по роли ложится только на `<svg>`.
				 */
				readonly element?: () => Element
		  }
		| {
				/** Обёртка вокруг компонента. */
				readonly wrapper: TWrapper
				readonly frame?: undefined
				/**
				 * Элемент компонента в проекции обёртки — тег, которым его пишут в
				 * разметке. Обёртка получает его раньше, чем на нём соберётся
				 * компонент, поэтому элемент строит хост.
				 */
				readonly element: () => Element
		  }
		| {
				readonly wrapper?: undefined
				/**
				 * Рамка вокруг компонента — разметка без компонента
				 * (`PreviewFrameComponent`): её стиль строкой CSS, от пропсов
				 * оболочки — граница ширины, а у таблицы с закреплённой шапкой ещё
				 * и окно прокрутки. Смена пропсов пишет рамке новый стиль.
				 */
				readonly frame: (props: TProps) => string
				/** Элемент компонента в проекции рамки — как в проекции обёртки. */
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

/** Разметка `div` со стилем строкой CSS и своим содержимым — ряд, окно прокрутки. */
const markup = (style: string, content: readonly TContent[]): TMarkup => ({
	markup: () => {
		const node = document.createElement('div')

		node.setAttribute('style', style)

		return node
	},
	content,
})

/** Содержимое коллекций — из общего манифеста, как у Vue и React. */
const ITEMS = COLLECTION_ITEMS

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не содержимое: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: { component: TButtonComponent },

	input: { component: TInputComponent },

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

	// Подпись — проп `text` из пропсов превью, контрол — содержимым. Строки
	// страницы правят саму подпись: сторону, размер текста, вариант
	label: {
		component: TLabelComponent,
		content: [{ component: TCheckBoxComponent, element: tag('so-check-box') }],
	},

	// Поле формы вокруг Input: тексты частей — пропсы превью, контрол —
	// содержимым. Строки страницы правят само поле: сторону подписи, тексты,
	// ошибку
	field: {
		component: TFieldComponent,
		content: [
			{
				component: TInputComponent,
				element: tag('so-input'),
				props: { placeholder: 'name@example.com' },
			},
		],
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

	// Элементы — частями разметки, а пришли данными (`items` блока групп
	// страницы) — из них: части заменили бы данные, а группы список рисует из
	// данных
	'list-box': {
		component: TListBoxComponent,
		content: (bind) =>
			bind.items
				? []
				: ITEMS.map((item) => ({
						component: TListBoxItemComponent,
						element: tag('so-list-box-item'),
						props: { ...item },
					})),
	},

	// Строки и колонки — данными, как у Vue и React: частей разметкой у таблицы
	// нет. Рамка — граница ширины, а с закреплённой шапкой — ещё и окно прокрутки
	// высотой 320 px на сорок строк. Окно таблицы — на странице Virtual
	table: {
		component: TTableComponent,
		element: tag('so-table'),
		frame: (bind) =>
			bind.stickyHead ? 'width: 100%; height: 320px; overflow: auto' : 'width: 100%',
		props: (bind) => ({
			items: bind.stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS,
			columns: TABLE_COLUMNS,
		}),
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
	// бег — флаг `indeterminate`
	'progress-spinner': { component: TProgressSpinnerComponent },

	skeleton: { component: TSkeletonComponent },

	// Окно на списке и таблице по тысяче элементов: на пяти его не видно.
	// ListBox с пределом строк прокручивается сам, таблица — в окне прокрутки
	// высотой 320 px; строка `enabled` включает и выключает окно у обоих.
	// Элементы — данными (`items`): элементы разметкой окно не прячет. Ряд —
	// граница ширины, как у Vue и React. Select в Angular нет, и его окна рядом
	// тоже. Переставленную колонку таблица ведёт целиком, с ячейками строк
	// (`reorderPreview: 'column'`): в окне это сотни ячеек, а не тысячи
	virtual: {
		component: TVirtualComponent,
		content: [
			markup('display: flex; gap: 24px; align-items: flex-start; width: 100%', [
				{
					component: TListBoxComponent,
					element: tag('so-list-box'),
					props: { items: COLLECTION_MANY_ITEMS, maxRows: 8, aria_label: 'Пункты' },
				},
				markup('flex: 1; min-width: 0; height: 320px; overflow: auto', [
					{
						component: TTableComponent,
						element: tag('so-table'),
						props: {
							items: TABLE_MANY_ROWS,
							columns: TABLE_COLUMNS,
							reorderPreview: 'column',
							aria_label: 'Сотрудники',
						},
					},
				]),
			]),
		],
	},
}
