import type { TToastsItemType } from '@soldy-ui/core'
import {
	COLLECTION_ITEMS,
	COLLECTION_MANY_ITEMS,
	TABLE_COLUMNS,
	TABLE_MANY_ROWS,
	TABLE_ROWS,
	TABLE_SCROLL_ROWS,
	TOASTS_ITEM_TYPES,
	TOAST_SAVING,
	toastSample,
} from '@soldy-ui/playground-shared'
import { toastsOf, type TToastRender } from '@soldy-ui/webc'

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
	 * Пропсы строки, от которых зависят дети (`slots` функцией), — их смена
	 * строит элемент заново, как смена `ctrl`: дети ставятся до вставки, а
	 * свет собранного элемента база уже разложила. Так у Menu режим
	 * контекстного меню (`openOn`) меняет триггер на область, как разметка Vue.
	 */
	readonly rebuild?: readonly string[]
	/**
	 * Обёртка — элемент вокруг компонента, как у Vue и React: подпись Label у
	 * CheckBox, Switch, Slider и Rating — элемент soldy со своими пропсами, в
	 * слоте по умолчанию которого лежит компонент, — а у таблицы, полосы
	 * ProgressLinear и ленты Scroller граница ширины, `div` со стилем (у
	 * таблицы — от пропсов строки), у выезжающей панели — её контейнер. Пропсы
	 * строки, `ctrl` и слушатели — у компонента, обёртке пропсы задаёт
	 * описание. Код колонок обёртку не показывает: он про компонент.
	 */
	readonly wrapper?: TPreview
	/**
	 * Кнопка, которая открывает компонент, — её подпись: окно и выезжающую
	 * панель на стенде открывает кнопка, как у Vue, — закрытые они спрятаны, а
	 * открытые накрывают страницу подложкой. Button встаёт в обёртку перед
	 * компонентом, и нажатие пишет компоненту `visible = true`, как кнопка
	 * превью Vue — своё состояние `v-model:visible`. Без обёртки кнопке негде
	 * стоять: корень превью — один узел.
	 */
	readonly opener?: string
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

/**
 * Элемент ленты — как у Vue: строчный блок с отступом, без переноса текста.
 * Каждый — прямой ребёнок вьюпорта: по ним тема ставит точки снапа, а плагин
 * считает края.
 */
const strip = (value: string) => (): Node => {
	const node = document.createElement('span')

	node.style.cssText = 'padding:4px 12px; white-space:nowrap'
	node.textContent = value

	return node
}

/** Абзац содержимого панели поповера — как у Vue: с отступом до кнопки под ним. */
const paragraph = (value: string) => (): Node => {
	const node = document.createElement('p')

	node.style.margin = '0 0 8px'
	node.textContent = value

	return node
}

/** Кнопка с подписью — в слоте: триггер поповера и подсказки, кнопка в панели. */
const button = (text: string): TPreview => ({ tag: 'button', is: 'so-button', props: { text } })

/**
 * Строчная подпись — в именованном слоте: заголовок окна и выезжающей панели.
 * Текст без элемента атрибута `slot` не несёт и ушёл бы в слот по умолчанию.
 */
const caption = (value: string) => (): Node => {
	const node = document.createElement('span')

	node.textContent = value

	return node
}

/** Поле с подсказкой — в теле окна и выезжающей панели, как у Vue. */
const field = (placeholder: string): TPreview => ({
	tag: 'div',
	is: 'so-input',
	props: { placeholder },
})

/**
 * Кнопка подвала окна и выезжающей панели — как у Vue: нажатие закрывает их
 * записью открытости (`visible = false`). Свою панель кнопка находит по месту
 * — ближайший предок с классом панели: окно, увезённое в цель, держит её в
 * себе.
 */
const closing = (text: string) => (): Node => {
	const node = soldy('button', 'so-button', { text })

	node.addEventListener('click', () => {
		const panel = node.closest('.so-dialog, .so-drawer')

		if (panel) Reflect.set(panel, 'visible', false)
	})

	return node
}

/** Своё содержимое тоста — кнопка «Отменить»: тост приходит ей параметром и закрывается ею. */
const undo: TToastRender = (toast) => {
	const node = soldy('button', 'so-button', { text: 'Отменить' })

	node.addEventListener('click', () => toast.close())

	return node
}

/**
 * Тосты приходят из кода, а не из разметки: кнопки внутри менеджера берут API
 * у своего места (`toastsOf`) и показывают тост, как кнопки превью Vue —
 * `useToasts()`. Менеджер оборачивает их, как приложение, а регион с тостами
 * уехал к краю окна, мимо ячейки превью.
 *
 * Кнопка — на обычное сообщение и на каждый вид (`TOASTS_ITEM_TYPES`). Что
 * сообщает тост, — образцы стенда, одни на все хосты (`toastSample`), своё
 * содержимое к ним — кнопка «Отменить» этого хоста. Текст начинается с номера:
 * в стопке видно, какой тост где. Последняя кнопка — ожидание: «Сохраняем…» с
 * кольцом на месте значка сам не закрывается, а через пару секунд тот же тост
 * сообщает успех. Ряд кнопок — с переносом, как у Vue. Номера — свои у каждой
 * отрисовки ряда.
 */
const toastsTrigger = (): Node => {
	const row = document.createElement('div')
	let count = 0

	row.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px'

	const notify = (node: Element, type?: TToastsItemType) => {
		const sample = toastSample(type, undo)

		count += 1
		toastsOf(node).show({ ...sample, text: `${count}. ${sample.text}`, type })
	}

	// Работа идёт — тост ждёт; кончилась — тот же тост сообщает итог
	const save = (node: Element) => {
		count += 1

		const toast = toastsOf(node).show({ text: `${count}. Сохраняем…`, loading: true })
		const done = `${count}. Сохранено`

		setTimeout(() => {
			if (!toast) return

			toast.loading = false
			toast.type = 'success'
			toast.text = done
		}, TOAST_SAVING)
	}

	const action = (text: string, act: (node: Element) => void): Node => {
		const node = soldy('button', 'so-button', { text })

		node.addEventListener('click', () => act(node))

		return node
	}

	row.append(
		action('обычное', (node) => notify(node)),
		...TOASTS_ITEM_TYPES.map((type) => action(type, (node) => notify(node, type))),
		action('загрузка → готово', save),
	)

	return row
}

/**
 * Граница ширины — как у Vue: сцена ячейки — флексбокс, и полоса или лента
 * держала бы там только свой минимум, а лента с шириной по содержимому
 * вылезла бы за колонку целиком — листать стало бы нечего.
 */
const FULL_WIDTH: TPreview = { tag: 'div', style: () => 'width:100%' }

/** Содержимое коллекций — из общего манифеста, как у Vue и React. */
const ITEMS = COLLECTION_ITEMS

/**
 * Область контекстного меню — как «файл» у потребителя, как у Vue: меню
 * вызывают над ней правой кнопкой, долгим касанием и Shift+F10, и панель
 * встаёт у точки вызова. Область — нативная кнопка, как у Vue: под фокусом для
 * Shift+F10, со своими ролью и именем и без связки с меню.
 */
const contextArea = (): Node => {
	const node = document.createElement('button')

	node.type = 'button'
	node.style.cssText = 'padding:24px 32px; border:1px dashed; border-radius:8px'
	node.textContent = 'Правая кнопка, долгое касание или Shift+F10'

	return node
}

/** Пункт меню разметкой: элемент части со своими пропсами и детьми по слотам. */
const menuPart = (
	is: string,
	props: TPreviewProps = {},
	slots: Readonly<Record<string, readonly TContent[]>> = {},
): TPreview => ({ tag: 'div', is, props, slots })

/**
 * Пункты меню разметкой, как у Vue: группа флажков с подписью, группа
 * переключателей — отмечен один, — действия с подсказками сочетаний в слоте
 * `trailing`, подменю с подменю внутри, пункт с панелью, которая монтируется с
 * первым открытием, выключенное действие и «опасный» пункт своего варианта.
 * Календаря в Web Components нет, и в панели «Срок» — поле числа дней, как у
 * Solid.
 */
const MENU_ITEMS: readonly TContent[] = [
	menuPart(
		'so-menu-group',
		{ label: 'Вид' },
		{
			default: [
				menuPart('so-menu-checkbox-item', { value: 'grid', text: 'Сетка', selected: true }),
				menuPart('so-menu-checkbox-item', { value: 'ruler', text: 'Линейка' }),
			],
		},
	),
	menuPart('so-menu-separator'),
	menuPart(
		'so-menu-radio-group',
		{ label: 'Сортировка', value: 'name' },
		{
			default: [
				menuPart('so-menu-radio-item', { value: 'name', text: 'По имени' }),
				menuPart('so-menu-radio-item', { value: 'date', text: 'По дате' }),
			],
		},
	),
	menuPart('so-menu-separator'),
	menuPart(
		'so-menu-item',
		{ value: 'edit', text: 'Изменить' },
		{ trailing: [caption('Ctrl+E')] },
	),
	menuPart(
		'so-menu-item',
		{ value: 'copy', text: 'Дублировать' },
		{ trailing: [caption('Ctrl+D')] },
	),
	menuPart(
		'so-menu-submenu',
		{ value: 'share', text: 'Поделиться' },
		{
			default: [
				menuPart('so-menu-item', { value: 'link', text: 'Ссылка' }),
				menuPart('so-menu-item', { value: 'mail', text: 'Почта' }),
				menuPart(
					'so-menu-submenu',
					{ value: 'messengers', text: 'Мессенджеры' },
					{
						default: [
							menuPart('so-menu-item', { value: 'telegram', text: 'Telegram' }),
							menuPart('so-menu-item', { value: 'whatsapp', text: 'WhatsApp' }),
						],
					},
				),
			],
		},
	),
	menuPart(
		'so-menu-popover-item',
		{ value: 'due', text: 'Срок', lazyMount: true },
		{
			default: [
				{
					tag: 'div',
					is: 'so-field',
					props: { label: 'Через, дней' },
					slots: {
						default: [
							{ tag: 'div', is: 'so-number-input', props: { value: 3, min: 0 } },
						],
					},
				},
			],
		},
	),
	menuPart('so-menu-item', { value: 'archive', text: 'В архив', disabled: true }),
	menuPart('so-menu-separator'),
	menuPart(
		'so-menu-item',
		{ value: 'remove', text: 'Удалить', variant: 'negative' },
		{
			trailing: [caption('Del')],
		},
	),
]

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
	'number-input': { tag: 'div', is: 'so-number-input' },

	textarea: { tag: 'div', is: 'so-textarea' },

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

	// Имени у ползунка нет, как у флажка: видимое даёт подпись Label над
	// ползунком. Горизонтальный тянется на её ширину, вертикальный — своей
	// высоты
	slider: {
		tag: 'span',
		is: 'so-slider',
		wrapper: { tag: 'label', is: 'so-label', props: { text: 'Громкость', position: 'top' } },
	},

	// Имени у оценки нет, как у ползунка: видимое даёт подпись Label над звёздами
	rating: {
		tag: 'span',
		is: 'so-rating',
		wrapper: { tag: 'label', is: 'so-label', props: { text: 'Оценка', position: 'top' } },
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

	// Содержимое ленты — просто разметка, по элементу на пункт: коллекции у неё
	// нет. Лента — в границе ширины, как у Vue
	scroller: {
		tag: 'div',
		is: 'so-scroller',
		slots: { default: ITEMS.map((item) => strip(`${item.text} пункт ленты`)) },
		wrapper: FULL_WIDTH,
	},

	// Содержимого у пагинации нет: страницы окна кладёт в коллекцию она сама,
	// а рисует её шаблон. Язык номеров и имён стрелок — из шапки стенда
	pagination: { tag: 'nav', is: 'so-pagination' },

	// Триггер — Button в слоте `trigger`: связку с панелью и вид «нажат» он
	// получает сам, scope у слотов нет. В содержимом есть кнопка: на неё при
	// открытии уходит фокус
	popover: {
		tag: 'span',
		is: 'so-popover',
		slots: {
			trigger: [button('Открыть')],
			default: [
				paragraph('Произвольное содержимое: текст, поля, кнопки'),
				button('Действие'),
			],
		},
	},

	// Триггер — Button в слоте `trigger`: связку с меню и вид «нажата» он
	// получает сам, scope у слотов нет. У контекстного меню (`openOn:
	// 'contextmenu'`) в слоте область, как у Vue. Режим область берёт из пропсов
	// колонки: у колонки экземпляра его нет, и там меню вызывают над кнопкой.
	// Дети ставятся до вставки, поэтому смена режима строит элемент заново
	// (`rebuild`). Пункты — разметкой, как у Vue; пришли данными (`items` блока
	// групп страницы) — из них: разметка заменила бы данные, а группы меню
	// рисует из данных
	menu: {
		tag: 'span',
		is: 'so-menu',
		rebuild: ['openOn'],
		slots: (bind) => ({
			trigger: [bind.openOn === 'contextmenu' ? contextArea : button('Действия')],
			default: bind.items ? [] : MENU_ITEMS,
		}),
	},

	// Триггер — Button в слоте `trigger`: ссылку на панель (`aria-describedby`)
	// он получает сам. Текст подсказки — слотом по умолчанию: пропа текста у неё
	// нет
	tooltip: {
		tag: 'span',
		is: 'so-tooltip',
		slots: {
			trigger: [button('Наведи')],
			default: [text('Короткое пояснение к кнопке')],
		},
	},

	// Окно открывает кнопка, как у Vue: закрытое оно спрятано, а открытое
	// накрывает страницу подложкой. Кнопка и окно — прямо в ячейке: обёртка без
	// коробки. Окно уезжает в `body`, в ячейке — его якорь; кнопки подвала его
	// закрывают
	dialog: {
		tag: 'div',
		is: 'so-dialog',
		opener: 'Открыть окно',
		slots: {
			title: [caption('Настройки')],
			default: [paragraph('Произвольное содержимое: текст, поля, кнопки'), field('Имя')],
			footer: [closing('Отмена'), closing('Сохранить')],
		},
		wrapper: { tag: 'div', style: () => 'display:contents' },
	},

	// Выезжающую панель тоже открывает кнопка. Кнопка и панель — в своей коробке
	// с `position: relative`, как у Vue: с `contained` панель не уезжает, а
	// встаёт в ней, и строка `contained` показывает её в коробке превью
	drawer: {
		tag: 'div',
		is: 'so-drawer',
		opener: 'Открыть панель',
		slots: {
			title: [caption('Фильтры')],
			default: [paragraph('Произвольное содержимое: текст, поля, кнопки'), field('Поиск')],
			footer: [closing('Сбросить'), closing('Применить')],
		},
		wrapper: {
			tag: 'div',
			style: () => 'position:relative; width:100%; min-height:240px; overflow:hidden',
		},
	},

	// Менеджер — автономный элемент без коробки, своим тегом, вокруг ряда
	// кнопок, которые показывают тосты из кода. Регион с тостами — у края окна
	toasts: { tag: 'so-toasts', slots: { default: [toastsTrigger] } },

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

	// Длину горизонтальной полосе даёт контейнер, своей у неё нет: обёртка —
	// граница ширины, как у Vue. Вертикальная — строчный блок своей высоты, и
	// обёртка ей не мешает. По умолчанию полоса пуста — доля ноль, а бег —
	// флаг `indeterminate`
	'progress-linear': { tag: 'span', is: 'so-progress-linear', wrapper: FULL_WIDTH },

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
