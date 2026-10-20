import {
	COLLECTION_ITEMS,
	COLLECTION_MANY_ITEMS,
	TABLE_COLUMNS,
	TABLE_MANY_ROWS,
	TABLE_ROWS,
	TABLE_SCROLL_ROWS,
} from '@soldy-ui/playground-shared'

/**
 * Как рисовать компонент на стенде — в Web Components.
 *
 * Та же карта, что у хоста Vue (`hosts/vue/previews.ts`), и с теми же ключами
 * — идентификаторами реестра. Разметки у платформы нет: элемент строит код
 * хоста (`document.createElement(tag, { is })`), поэтому превью — не функция
 * с разметкой, а описание элемента: нативный тег, имя элемента soldy, свои
 * атрибуты элемента, дети по слотам и обёртка. Превью то же самое, что у Vue и
 * React, чтобы колонки фреймворков можно было сравнивать глазами.
 *
 * Значений пропов компонента превью в описании нет: подпись кнопки,
 * плейсхолдер поля — данные, одни на все хосты (`PREVIEW_PROPS` в общем
 * пакете), и компоненту их отдаёт оболочка вместе с пропсами строки. Свои
 * пропсы описания — у обёртки и детей, а у компонента — только то, что рисует
 * само превью, как у соседних хостов: строки и колонки таблицы.
 *
 * Чего у адаптера нет, того нет и в карте: компоненты переносятся своими
 * задачами.
 */
export type TPreview = {
	/** Нативный тег элемента: элемент soldy — встроенный элемент своего тега. */
	readonly tag: string
	/**
	 * Имя элемента soldy — значение `is`. Нет — элемент автономный, и имя —
	 * сам тег (`<so-virtual>`, `<so-drag-and-drop>`), или это вовсе не элемент
	 * soldy: обёртка-граница таблицы, ряд превью DragAndDrop и его ячейки.
	 */
	readonly is?: string
	/**
	 * Пропсы описания — у обёртки и детей; у компонента превью — только данные,
	 * которые рисует само превью (строки и колонки таблицы): значения его пропов
	 * отдаёт оболочка (`PREVIEW_PROPS`). Функция — пропсы от пропсов строки
	 * компонента: таблице с закреплённой шапкой — длинный список строк.
	 */
	readonly props?: TPreviewProps | ((bind: TPreviewProps) => TPreviewProps)
	/**
	 * Стиль элемента без компонента. У обёртки — от пропсов строки компонента:
	 * граница ширины таблицы, а с закреплённой шапкой — ещё и окно прокрутки, и
	 * смена пропсов строки пишет его заново. У ребёнка в слоте — ряд превью
	 * DragAndDrop и его ячейки: пропсов строки ребёнок не получает, и стиль
	 * пишется один раз, при постройке.
	 */
	readonly style?: (bind: TPreviewProps) => string
	/**
	 * Свои атрибуты элемента — не пропы ядра, а то, что элемент читает сам: роль
	 * иконки (`icon`). Имя — как у свойства элемента, атрибут — то же имя через
	 * дефис, как у пропов. Это часть того, что элемент рисует: код колонок пишет
	 * их всегда, без роли иконка пуста.
	 */
	readonly attributes?: Readonly<Record<string, string>>
	/**
	 * Дети по слотам — свет элемента: имя слота → элементы soldy и разметка без
	 * компонента. Код хоста ставит их в элемент до вставки, элементы — с
	 * атрибутом `slot`, кроме слота по умолчанию. Функция — дети от пропсов
	 * строки компонента: список, состав которого пришёл данными (`items` блока
	 * групп страницы), рисуется без элементов разметки — они заменили бы данные.
	 * Дети ставятся до вставки, и смена пропсов их не перестраивает.
	 */
	readonly slots?:
		| Readonly<Record<string, readonly TContent[]>>
		| ((bind: TPreviewProps) => Readonly<Record<string, readonly TContent[]>>)
	/**
	 * Обёртка — элемент вокруг компонента, как у Vue и React: подпись Label у
	 * CheckBox и Switch — элемент soldy со своими пропсами, в слоте по
	 * умолчанию которого лежит компонент, — а у таблицы граница ширины, `div`
	 * со стилем от пропсов строки. Пропсы строки, `ctrl` и слушатели — у
	 * компонента, обёртке пропсы задаёт описание. Код колонок обёртку не
	 * показывает: он про компонент.
	 */
	readonly wrapper?: TPreview
}

/** Пропсы элемента — свойствами, по имени. */
export type TPreviewProps = Readonly<Record<string, unknown>>

/**
 * Ребёнок в слоте: элемент soldy со своим описанием — часть коллекции, контрол
 * подписи — или разметка без компонента — текст, блок с отступом. Разметку
 * строит функция: у каждой отрисовки свои узлы.
 */
export type TContent = TPreview | (() => Node)

/** Текст в слоте — подпись радио. */
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

/**
 * Элемент soldy в разметке без компонента — кодом, как его строит
 * потребитель: пропсы свойствами до вставки.
 */
function soldy(tag: string, is: string, props: TPreviewProps): HTMLElement {
	const element = document.createElement(tag, { is })

	for (const [name, value] of Object.entries(props)) Reflect.set(element, name, value)

	return element
}

/**
 * Содержимое окна — как у Vue и React: список с пределом строк, который
 * прокручивается сам, и таблица в обёртке высотой 320 px, по тысяче элементов
 * — на пяти окна не видно. Элементы — данными: элементы разметкой окно не
 * прячет. Ряд — граница ширины. Select в Web Components нет, и его окна рядом
 * тоже. Переставленную колонку таблица ведёт целиком, с ячейками строк
 * (`reorderPreview: 'column'`): в окне это сотни ячеек, а не тысячи.
 */
const windowed = (): Node => {
	const row = document.createElement('div')
	const frame = document.createElement('div')

	row.style.cssText = 'display:flex; gap:24px; align-items:flex-start; width:100%'
	frame.style.cssText = 'flex:1; min-width:0; height:320px; overflow:auto'
	frame.appendChild(
		soldy('div', 'so-table', {
			items: TABLE_MANY_ROWS,
			columns: TABLE_COLUMNS,
			reorderPreview: 'column',
			aria_label: 'Сотрудники',
		}),
	)
	row.append(
		soldy('div', 'so-list-box', {
			items: COLLECTION_MANY_ITEMS,
			maxRows: 8,
			aria_label: 'Пункты',
		}),
		frame,
	)

	return row
}

/**
 * Табы и их панели — описанием, у превью Tabs и DragAndDrop. Первый таб
 * активен сразу — иначе ни одна панель не покажется. Панели — слотом
 * `content`, вне списка табов.
 */
const TABS: TPreview = {
	tag: 'div',
	is: 'so-tabs',
	slots: {
		default: ITEMS.map((item, index) => ({
			tag: 'div',
			is: 'so-tabs-item',
			props: { active: index === 0, ...item },
		})),
		content: ITEMS.map((item) => ({
			tag: 'div',
			is: 'so-tabs-content',
			props: { value: item.value },
			slots: { default: [block('12px', `Панель «${item.text}»`)] },
		})),
	},
}

/** Секции с содержимым — описанием, у превью Accordion и DragAndDrop. */
const ACCORDION: TPreview = {
	tag: 'div',
	is: 'so-accordion',
	slots: {
		default: ITEMS.map((item) => ({
			tag: 'div',
			is: 'so-accordion-item',
			props: { ...item },
			slots: { default: [block('4px 0', `Содержимое «${item.text}»`)] },
		})),
	},
}

/**
 * Ряд превью DragAndDrop — как у Vue и React: Tabs и Accordion — теми же
 * описаниями, что на их страницах, ListBox — данными. Ряд и ячейки — разметка
 * без компонента со своим стилем: ряд — граница ширины, как у окна, табы — во
 * всю ширину ряда, список и секции — под ними, рядом.
 */
const REORDERABLE: TPreview = {
	tag: 'div',
	style: () => 'display:flex; flex-wrap:wrap; gap:24px; align-items:flex-start; width:100%',
	slots: {
		default: [
			{ tag: 'div', style: () => 'flex:1 1 100%; min-width:0', slots: { default: [TABS] } },
			{ tag: 'div', is: 'so-list-box', props: { items: ITEMS, aria_label: 'Пункты' } },
			{ tag: 'div', style: () => 'flex:1; min-width:200px', slots: { default: [ACCORDION] } },
		],
	},
}

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не содержимое: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: { tag: 'button', is: 'so-button' },

	input: { tag: 'div', is: 'so-input' },

	// Текста у флажка и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': {
		tag: 'span',
		is: 'so-check-box',
		wrapper: { tag: 'label', is: 'so-label', props: { text: 'Согласен' } },
	},

	switch: {
		tag: 'span',
		is: 'so-switch',
		wrapper: { tag: 'label', is: 'so-label', props: { text: 'Включено' } },
	},

	// Подпись — проп `text` из пропсов превью, контрол — слотом. Строки
	// страницы правят саму подпись: сторону, размер текста, вариант
	label: {
		tag: 'label',
		is: 'so-label',
		slots: { default: [{ tag: 'span', is: 'so-check-box' }] },
	},

	// Поле формы вокруг Input: тексты частей — пропсы превью, контрол —
	// слотом. Строки страницы правят само поле: сторону подписи, тексты, ошибку
	field: {
		tag: 'div',
		is: 'so-field',
		slots: {
			default: [{ tag: 'div', is: 'so-input', props: { placeholder: 'name@example.com' } }],
		},
	},

	// Подпись — содержимым: текста у радио нет, оно голый контрол, как CheckBox.
	// Корень радио — подпись, `<label is="so-radio-group-item">`
	'radio-group': {
		tag: 'div',
		is: 'so-radio-group',
		slots: {
			default: ITEMS.map((item) => ({
				tag: 'label',
				is: 'so-radio-group-item',
				props: { value: item.value },
				slots: { default: [text(item.text)] },
			})),
		},
	},

	tabs: TABS,

	accordion: ACCORDION,

	// Элементы — разметкой, как у Vue и React. Строка элемента — кнопка на `div`
	// (`<div is="so-button-div">`): её строит шаблон элемента. Пришли данными
	// (`items` блока групп страницы) — из них: разметка заменила бы данные, а
	// группы список рисует из данных
	'list-box': {
		tag: 'div',
		is: 'so-list-box',
		slots: (bind) => ({
			default: bind.items
				? []
				: ITEMS.map((item) => ({
						tag: 'div',
						is: 'so-list-box-item',
						props: { ...item },
					})),
		}),
	},

	// Строки и колонки — данными, как у Vue и React: частей разметкой у таблицы
	// нет. Элемент — окно таблицы, а обёртка вокруг — граница ширины, с
	// закреплённой шапкой — ещё и окно прокрутки высотой 320 px на сорок строк.
	// Окно `Virtual` — на своей странице
	table: {
		tag: 'div',
		is: 'so-table',
		props: (bind) => ({
			items: bind.stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS,
			columns: TABLE_COLUMNS,
		}),
		wrapper: {
			tag: 'div',
			style: (bind) =>
				bind.stickyHead ? 'width:100%; height:320px; overflow:auto' : 'width:100%',
		},
	},

	// Глиф — роль, свой атрибут элемента: `<svg>` рисунка строит шаблон Icon
	icon: { tag: 'span', is: 'so-icon', attributes: { icon: 'arrowDown' } },

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`
	'progress-spinner': { tag: 'span', is: 'so-progress-spinner' },

	skeleton: { tag: 'div', is: 'so-skeleton' },

	// Перестановка — автономный элемент без коробки, своим тегом, как окно: у
	// Vue и React узла у обёртки нет. Коллекции — в его свете, в ряду
	'drag-and-drop': { tag: 'so-drag-and-drop', slots: { default: [REORDERABLE] } },

	// Окно — автономный элемент без коробки, своим тегом: у Vue и React узла у
	// обёртки нет. Строка `enabled` включает и выключает окно у обоих
	virtual: { tag: 'so-virtual', slots: { default: [windowed] } },
}
