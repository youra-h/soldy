import { inputBinding, type DirectiveWithBindings, type Type } from '@angular/core'
import {
	COLLECTION_ITEMS,
	TABLE_COLUMNS,
	TABLE_ROWS,
	TABLE_SCROLL_ROWS,
} from '@soldy-ui/playground-shared'
import type { TFixture } from './fixtures'
import {
	DialogPreview,
	DragAndDropPreview,
	DrawerPreview,
	MenuItemsPreview,
	MenuPreview,
	PopoverPreview,
	ToastsPreview,
	TooltipPreview,
	VirtualPreview,
} from './templates'
import {
	RoleIconDirective,
	TAccordionComponent,
	TAccordionItemComponent,
	TButtonComponent,
	TCalendarComponent,
	TCheckBoxComponent,
	TDateInputComponent,
	TDatePickerComponent,
	TFieldComponent,
	TIconComponent,
	TInputComponent,
	TLabelComponent,
	TListBoxComponent,
	TListBoxItemComponent,
	TNumberInputComponent,
	TPaginationComponent,
	TProgressLinearComponent,
	TProgressSpinnerComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TRatingComponent,
	TScrollerComponent,
	TSelectComponent,
	TSelectItemComponent,
	TSkeletonComponent,
	TSliderComponent,
	TSwitchComponent,
	TTableComponent,
	TTabsComponent,
	TTabsContentComponent,
	TTabsItemComponent,
	TTagsComponent,
	TTextareaComponent,
} from '@soldy-ui/angular'

/** Пропсы компонента — именами разметки. */
export type TProps = Readonly<Record<string, unknown>>

/**
 * Часть содержимого — компонент адаптера на своём элементе, как его пишут в
 * разметке владельца: `<div so-list-box-item>`, `<label so-radio-group-item>`.
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
 *
 * Превью, которому нужны шаблоны слотов или своё состояние, и компонент без
 * корня — своим шаблоном (`TTemplatePreview`).
 */
export type TPreview = TComponentPreview | TTemplatePreview

/**
 * Превью своим шаблоном: компонент хоста с разметкой, как у фикстур
 * (`TFixture`), — когда компоненту нужны шаблоны слотов или своё состояние
 * превью. Триггер Popover и Tooltip — шаблон слота со scope, а шаблоны слотов
 * видит только разметка (`contentChildren`): у компонента, которого хост
 * строит сам, их нет. Окно и выезжающую панель открывает кнопка превью, а
 * открытость — его своё состояние, как у Vue. Тосты показывают кнопки внутри
 * менеджера тостов, а API им даёт компонент под менеджером (`useToasts()`
 * полем) — тоже разметка. Компонент без корня — окно `Virtual` и перестановка
 * `DragAndDrop` — директива на `<ng-container>`, а директиву хост сам не
 * строит: `createComponent` строит только компонент. Ставит такое превью хост
 * путём фикстуры: пропсы оболочки уходят входам компонента превью, а выходы
 * хост слушает у компонента в его разметке (`subject`).
 *
 * Разметка превью бывает от пропсов оболочки: меню, состав которого пришёл
 * данными, рисуется без пунктов разметки — они заменили бы данные. Тогда
 * компонент превью выбирает функция пропсов (`templateFor`), когда превью
 * ставится, а смена пропсов его не перестраивает, как содержимое превью
 * описанием. Не ветка `@if` в одном шаблоне: компонент в ветке появляется
 * только на первой проверке, а выходы хост слушает у него раньше — сразу
 * после создания превью, как подписки на выходы в шаблоне.
 */
export type TTemplatePreview =
	| { readonly template: Type<TFixture> }
	| { readonly templateFor: (props: TProps) => Type<TFixture> }

/** Превью описанием: компонент адаптера, обёртка или рамка вокруг него и содержимое. */
export type TComponentPreview = TPreviewBase &
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

/**
 * Элемент ленты — разметка без компонента, как у Vue: строка без переноса с
 * отступами, ширина — по тексту.
 */
const strip = (value: string) => (): Node => {
	const node = document.createElement('span')

	node.style.cssText = 'padding:4px 12px; white-space:nowrap'
	node.textContent = value

	return node
}

/**
 * Граница ширины, как `div` вокруг компонента у Vue: компонент встаёт во всю
 * ширину ячейки, а сцена ячейки — флексбокс, где он держал бы только свой
 * минимум.
 */
const FULL_WIDTH = (): string => 'width: 100%'

/** Содержимое коллекций — из общего манифеста, как у Vue и React. */
const ITEMS = COLLECTION_ITEMS

/**
 * Табы и их панели частями — у превью Tabs. Первый таб активен сразу — иначе
 * ни одна панель не смонтируется. Панели — слотом `content`, вне списка
 * табов.
 */
const TABS_CONTENT: readonly TContent[] = [
	...ITEMS.map((item, index) => ({
		component: TTabsItemComponent,
		element: tag('div'),
		props: { active: index === 0, ...item },
	})),
	...ITEMS.map((item) => ({
		component: TTabsContentComponent,
		element: tag('div'),
		slot: 'content',
		props: { value: item.value },
		content: [block('12px', `Панель «${item.text}»`)],
	})),
]

/** Секции частями, с содержимым, — у превью Accordion. */
const ACCORDION_CONTENT: readonly TContent[] = ITEMS.map((item) => ({
	component: TAccordionItemComponent,
	element: tag('div'),
	props: { ...item },
	content: [block('4px 0', `Содержимое «${item.text}»`)],
}))

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не содержимое: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: { component: TButtonComponent },

	input: { component: TInputComponent },
	'number-input': { component: TNumberInputComponent },

	textarea: { component: TTextareaComponent },

	// Текста у чекбокса и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': {
		component: TCheckBoxComponent,
		element: tag('span'),
		wrapper: { component: TLabelComponent, props: { text: 'Согласен' } },
	},

	switch: {
		component: TSwitchComponent,
		element: tag('span'),
		wrapper: { component: TLabelComponent, props: { text: 'Включено' } },
	},

	// Имени у ползунка нет, как у флажка: видимое даёт подпись Label над
	// ползунком. Горизонтальный тянется на её ширину, вертикальный — своей
	// высоты
	slider: {
		component: TSliderComponent,
		element: tag('span'),
		wrapper: { component: TLabelComponent, props: { text: 'Громкость', position: 'top' } },
	},

	// Имени у оценки нет, как у ползунка: видимое даёт подпись Label над звёздами
	rating: {
		component: TRatingComponent,
		element: tag('span'),
		wrapper: { component: TLabelComponent, props: { text: 'Оценка', position: 'top' } },
	},

	// Подпись — проп `text` из пропсов превью, контрол — содержимым. Строки
	// страницы правят саму подпись: сторону, размер текста, вариант
	label: {
		component: TLabelComponent,
		content: [{ component: TCheckBoxComponent, element: tag('span') }],
	},

	// Поле формы вокруг Input: тексты частей — пропсы превью, контрол —
	// содержимым. Строки страницы правят само поле: сторону подписи, тексты,
	// ошибку
	field: {
		component: TFieldComponent,
		content: [
			{
				component: TInputComponent,
				element: tag('div'),
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
						element: tag('div'),
						props: { ...item },
					})),
	},

	// Опции — частями разметки, а пришли данными (`items` блока групп страницы)
	// — из них: части заменили бы данные, а группы Select рисует из данных.
	// Опции встают в список панели, увезённой в `body`, а слой лифта Select
	// видят по инжектору владельца
	select: {
		component: TSelectComponent,
		content: (bind) =>
			bind.items
				? []
				: ITEMS.map((item) => ({
						component: TSelectItemComponent,
						element: tag('div'),
						props: { ...item },
					})),
	},

	// Содержимого у календаря нет: дни кладёт в коллекцию вид по месяцам
	// сеток. Языка у превью нет: это локаль провайдера корня хоста — выбор
	// языка в шапке (`setLocale` хоста)
	calendar: { component: TCalendarComponent },

	// Язык — из шапки стенда, как у календаря
	'date-input': { component: TDateInputComponent },

	// Поле и календарь — экземпляры DatePicker, содержимого у него нет. Язык —
	// из шапки стенда, как у поля и календаря
	'date-picker': { component: TDatePickerComponent },

	// Теги — данными, как у Vue: ряд во всю ширину ячейки, иначе переполнению
	// не с чем сравнивать — во флексе сцены ряд держал бы ширину по своим тегам
	tags: {
		component: TTagsComponent,
		element: tag('div'),
		frame: FULL_WIDTH,
		props: () => ({ items: ITEMS }),
	},

	// Строки и колонки — данными, как у Vue и React: частей разметкой у таблицы
	// нет. Рамка — граница ширины, а с закреплённой шапкой — ещё и окно прокрутки
	// высотой 320 px на сорок строк. Окно таблицы — на странице Virtual
	table: {
		component: TTableComponent,
		element: tag('div'),
		frame: (bind) =>
			bind.stickyHead ? 'width: 100%; height: 320px; overflow: auto' : 'width: 100%',
		props: (bind) => ({
			items: bind.stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS,
			columns: TABLE_COLUMNS,
		}),
	},

	tabs: { component: TTabsComponent, content: TABS_CONTENT },

	accordion: { component: TAccordionComponent, content: ACCORDION_CONTENT },

	// Лента во всю ширину ячейки: шириной по содержимому она вылезла бы за
	// колонку целиком — листать стало бы нечего. Содержимое — строки без
	// переноса, разметкой, как у Vue
	scroller: {
		component: TScrollerComponent,
		element: tag('div'),
		frame: FULL_WIDTH,
		content: ITEMS.map((item) => strip(`${item.text} пункт ленты`)),
	},

	// Содержимого у пагинации нет: страницы окна кладёт в коллекцию она сама, а
	// рисует её шаблон. Язык номеров и имён стрелок — из шапки стенда
	pagination: { component: TPaginationComponent },

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

	// Полоса во всю ширину ячейки, как у Vue: у строчного корня своей ширины
	// нет. По умолчанию она пуста — доля ноль, а бег — флаг `indeterminate`
	'progress-linear': {
		component: TProgressLinearComponent,
		element: tag('span'),
		frame: FULL_WIDTH,
	},

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`
	'progress-spinner': { component: TProgressSpinnerComponent },

	// Триггер — Button, связку с панелью и вид «нажат» он берёт из scope слота,
	// поэтому превью — своим шаблоном. В содержимом есть кнопка: на неё при
	// открытии уходит фокус
	popover: { template: PopoverPreview },

	// Триггер — Button, ссылку на панель он берёт из scope слота. Текст
	// подсказки — содержимым: пропа текста у неё нет
	tooltip: { template: TooltipPreview },

	// Триггер — Button, а у контекстного меню — область, связку с меню они
	// берут из scope слота; пункты — разметкой, а пришли данными — меню из них
	// (см. `MenuPreview`)
	menu: { templateFor: (bind) => (bind.items ? MenuItemsPreview : MenuPreview) },

	// Кнопка открывает окно, окно — на своём состоянии превью (см. `DialogPreview`)
	dialog: { template: DialogPreview },

	// Кнопка открывает панель, панель — на своём состоянии превью, в коробке с
	// `position: relative` для `contained` (см. `DrawerPreview`)
	drawer: { template: DrawerPreview },

	// Тосты приходят из кода: менеджер вокруг ряда кнопок, которые берут API
	// `useToasts()` и показывают тосты (см. `ToastsPreview`). Регион с тостами
	// уехал к краю окна, вне ячейки
	toasts: { template: ToastsPreview },

	skeleton: { component: TSkeletonComponent },

	// Перестановка у трёх коллекций сразу — `<ng-container so-drag-and-drop>`
	// вокруг ряда. Компонент без корня — директива на контейнере, а её хост сам
	// не строит, поэтому превью — своим шаблоном (см. `DragAndDropPreview`)
	'drag-and-drop': { template: DragAndDropPreview },

	// Окно на списке и таблице по тысяче элементов — `<ng-container
	// so-virtual>` вокруг ряда, своим шаблоном по той же причине (см.
	// `VirtualPreview`)
	virtual: { template: VirtualPreview },
}
