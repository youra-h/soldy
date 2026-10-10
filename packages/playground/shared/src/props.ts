import type { TPropSpec } from '@soldy-ui/setup'
import { underscorePropNaming } from '@soldy-ui/setup'
import {
	COMPONENT_SIZES,
	BUTTON_VIEWS,
	CALENDAR_MODES,
	CHECK_BOX_VIEWS,
	COMPONENT_VARIANTS,
	DATE_INPUT_KINDS,
	DATE_PICKER_MODES,
	DIALOG_PLACEMENTS,
	DIRECTIONS,
	DRAWER_PLACEMENTS,
	SWIPES,
	FRAME_PLACEMENTS,
	FRAME_POSITIONS,
	HTML_TAGS,
	LABEL_POSITIONS,
	LIST_CONTENT_FITS,
	LIST_INDICATORS,
	POPOVER_EDGES,
	POPOVER_PLACEMENTS,
	PROGRESS_LINEAR_ORIENTATIONS,
	RADIO_GROUP_VIEWS,
	SCROLL_BEHAVIORS,
	SELECTION_MODES,
	SELECT_EDITABLE_MODES,
	SELECT_PLACEMENTS,
	SKELETON_ANIMATIONS,
	SKELETON_SHAPES,
	SLIDE_ORIENTATIONS,
	SLIDE_SNAPS,
	SLIDER_TOOLTIPS,
	TABLE_COLUMN_FITS,
	TABLE_SORT_MODES,
	TABS_ALIGNMENTS,
	TABS_ORIENTATIONS,
	TABS_POSITIONS,
	TABS_VIEWS,
	TAGS_OVERFLOWS,
	TIME_PRECISIONS,
	TOOLTIP_PLACEMENTS,
	TOOLTIP_TYPES,
} from './enums'
import { COLLECTION_VALUES } from './items'
import type {
	TComponentEntry,
	TControlKind,
	TPropControl,
	TPropControlGroups,
	TPropOwner,
} from './types'

/**
 * Описания пропов — то единственное, чего нет в контракте.
 *
 * У слотов `description` есть (`ISlotDeclaration`), у пропов — нет: декларация
 * это `name / type / protected / triggers / get / set`, и всё. Добавлять поле в
 * `IPropDefinition` ради стенда не стали — строки поехали бы в бандл каждого
 * приложения, а потребителя в библиотеке у них нет.
 *
 * Расхождение с компонентами исключено тестом `__tests__/manifest.spec.ts`:
 * у каждого записываемого пропа каждого зарегистрированного дескриптора обязано
 * найтись описание. Именно отсутствие такой проверки сгноило прежнее демо.
 */

/**
 * Унаследованные пропы описываются один раз.
 *
 * Их дают слои `ComponentView`, `Stylable`, `Control`, `ValueControl`,
 * `InputControl`, `Field` — расписывать `size` в двадцати компонентах значило
 * бы получить двадцать слегка разных формулировок.
 */
const SHARED: Record<string, string> = {
	rendered: 'Есть ли компонент в дереве. Аналог v-if: false — узла нет вовсе',
	visible: 'Виден ли компонент. В отличие от rendered узел остаётся в дереве',
	tag: 'Тег корневого элемента. Меняет разметку, не меняя поведения',
	direction: 'Направление письма. inherit — атрибут dir не ставится вовсе',
	// Слой поверх страницы — общий у Frame, Dialog и Drawer
	target: 'Куда телепортировать слой: CSS-селектор, по умолчанию body',
	size: 'Размер: высота, отступы и кегль',
	variant: 'Смысловой цвет: обычный, акцентный, успех, ошибка, предупреждение',
	disabled: 'Запрещает взаимодействие и убирает из порядка обхода',
	focused: 'Фокус. Связан с настоящим фокусом в обе стороны',
	text: 'Текст компонента. Слот default его переопределяет',
	value: 'Значение контрола — то, что уйдёт в форму',
	name: 'Имя поля при отправке формы',
	readonly: 'Значение видно, но менять его нельзя',
	required: 'Поле обязательно. Рисует маркер и попадает в валидацию формы',
	id: 'Идентификатор поля. Пусто — берётся uid экземпляра',

	// Кнопка очистки — часть поля: общая у Input, DateInput и DatePicker (у
	// диапазона — одна на период), Select отдаёт её своему полю
	clearable: 'Показывать кнопку очистки значения',

	// Коллекционный — одинаков у ListBox, Select и Accordion
	mode: 'Режим выбора: ничего, один элемент или несколько',

	// Списочный контракт `IList` — общий у ListBox и Select. Предка у них
	// общего нет, но свойства одни и те же, значит и описание одно
	maxRows: 'Сколько строк показывать до появления прокрутки. 0 — все',
	contentFit: 'Что делать с не помещающимся текстом: обрезать, перенести или раздвинуть список',
	scrollBehavior: 'Как прокручивать к элементу при навигации с клавиатуры',
	indicator: 'Где показывать отметку выбранного: нигде, в начале или в конце строки',
}

/**
 * Пропы плагинов — по имени с неймспейсом, как их пишут в разметке.
 *
 * Имя с неймспейсом уникально на всю библиотеку, поэтому описание одно:
 * `anchor_placement` значит одно и то же у любого компонента с якорем, а
 * `placement` у Select — другой проп, и описан он у самого Select.
 */
const PLUGIN: Record<string, string> = {
	aria_label:
		'Доступное имя для скринридера. Нужно, когда видимого текста нет: иконка, поле без подписи',
	aria_labelledBy: 'id элемента, чей текст служит именем. Сильнее aria_label',
	aria_describedBy: 'id элемента с пояснением: подсказка под полем, текст ошибки',
	anchor_placement:
		'Сторона и выравнивание панели у якоря: -start и -end — по началу и концу, top и bottom — по центру. Не влезает по высоте — flip переносит на другую сторону',
	anchor_matchWidth: 'Тянуть ширину панели по ширине якоря',
	anchor_flip:
		'Переносить панель на другую сторону, если на выбранной она не влезает по высоте окна',
	anchor_offset: 'Отступ панели от якоря, px',
	dismiss_enabled:
		'Слушать ли нажатие мимо панели, чтобы её закрыть. У Select, Popover, Tooltip и DatePicker его ведёт сам плагин по open, у Dialog и Drawer — по visible',
	hideOutside_enabled:
		'Прятать ли страницу под окном от скринридера. У Dialog и Drawer его ведёт сам плагин по visible, у DatePicker — по open',
	scrollLock_enabled:
		'Запирать ли прокрутку страницы под окном. У Dialog его ведёт сам плагин по visible, у Drawer — пока панель открыта и не внутри контейнера',
}

/** Собственные пропы компонента — то, ради чего он и заведён. */
const OWN: Record<string, Record<string, string>> = {
	button: {
		view: 'Оформление: заливка, только текст, контур или ничего',
	},
	input: {
		placeholder: 'Подсказка в пустом поле',
	},
	'check-box': {
		indeterminate:
			'Третье состояние: выбрано частично. Ставится извне, клик снимает его и отмечает чекбокс',
		view: 'Оформление: рамка (по умолчанию), заливка или без рамки и фона',
	},
	label: {
		text: 'Текст подписи — доступное имя контрола. Слот content его переопределяет',
		position: 'С какой стороны от контрола стоит текст. start и end меняются местами в RTL',
	},
	'radio-group': {
		view: 'Отметка выбранного: точка внутри тонкого кольца или утолщённое кольцо. Группа раздаёт вид каждому радио',
	},
	select: {
		open: 'Раскрыта ли панель со списком',
		placeholder: 'Что показывать, пока ничего не выбрано',
		closeOnSelect: 'Закрывать панель после выбора. Для множественного выбора обычно false',
		editable: 'Можно ли вводить текст в поле. Выключено — режим select-only',
		editableMode:
			'Что делает ввод текста при editable: ничего, подсветка совпадения или фильтрация',
		removeOnBackspace:
			'Удалять выбранные теги по Backspace в пустом поле. Нужны editable и множественный выбор',
		placement:
			'С какой стороны открывается панель: auto — снизу, у края окна сверху; top и bottom — всегда там',
		swipe: 'За что панель можно смахнуть, чтобы закрыть: ни за что, за полосу или за любое место, кроме опций и прокручиваемого списка. Смахивают от поля: под ним — вниз, над ним — вверх',
		tags_overflow:
			'Что делать с тегами в поле, когда они не помещаются в строку: переносить или прокручивать. Нужен множественный выбор',
	},
	calendar: {
		value: 'Выбранная дата строкой YYYY-MM-DD; в multiple и range — список дат, его задают кодом',
		mode: 'Режим выбора: одна дата, несколько дат или диапазон «от и до»',
		min: 'Первый день, который можно выбрать, YYYY-MM-DD. Раньше — ни фокуса, ни выбора',
		max: 'Последний день, который можно выбрать, YYYY-MM-DD',
		weekStart: 'Первый день недели: 0 — воскресенье … 6 — суббота. Пусто — по языку',
		timeZone: 'Часовой пояс «сегодня», имя IANA: Europe/Moscow. Пусто — пояс среды',
	},
	'date-input': {
		value: 'Дата строкой YYYY-MM-DD, у поля даты и времени — YYYY-MM-DDTHH:mm, до секунды — YYYY-MM-DDTHH:mm:ss. Пока части набраны не все, значения нет',
		min: 'Первый верный день или момент, YYYY-MM-DD, YYYY-MM-DDTHH:mm или YYYY-MM-DDTHH:mm:ss. Раньше — не прижимается, а помечается ошибкой',
		max: 'Последний верный день или момент. Граница-день пропускает любое время своего дня, граница до минуты — любую секунду своей минуты',
		kind: 'Вид поля: date — только дата, datetime — ещё час, минута и, у 12-часовой локали, AM/PM. Цикл часов берётся из локали',
		timePrecision:
			'Точность времени: minute — до минуты, second — ещё секунда. У поля даты (kind: date) ничего не меняет',
	},
	'date-picker': {
		value: 'Дата строкой YYYY-MM-DD; в range — пара «начало, конец», её задают кодом. Пока поле набрано не целиком, значения нет',
		mode: 'Режим: одна дата — одно поле, диапазон — поля начала и конца в одной коробке. Кнопка и календарь — одни',
		open: 'Открыта ли панель с календарём. Открывают её кнопка календаря и Alt+↓ на поле',
		closeOnSelect:
			'Закрывать панель после выбора дня; в диапазоне — после второго. С confirmable не действует',
		confirmable:
			'Подтверждать выбор кнопкой: в подвале панели «Отмена» и «OK». Выбор в календаре значение не меняет, пока не нажали «OK»; любое другое закрытие его сбрасывает',
		min: 'Первый день, который можно выбрать, YYYY-MM-DD: в календаре раньше — ни фокуса, ни выбора, в поле — ошибка',
		max: 'Последний день, который можно выбрать, YYYY-MM-DD',
		weekStart: 'Первый день недели календаря: 0 — воскресенье … 6 — суббота. Пусто — по языку',
		timeZone: 'Часовой пояс «сегодня», имя IANA: Europe/Moscow. Пусто — пояс среды',
		name: 'Имя одной даты при отправке формы. У диапазона концы уходят под startName и endName',
		startName: 'Имя начала диапазона при отправке формы',
		endName: 'Имя конца диапазона при отправке формы',
		swipe: 'За что панель можно смахнуть, чтобы закрыть: ни за что, за полосу или за любое место, кроме контролов календаря и прокручиваемого содержимого. Смахивают от поля: под ним — вниз, над ним — вверх',
	},
	slider: {
		min: 'Начало хода',
		max: 'Конец хода. Вне сетки шага он недостижим, как у нативного поля',
		step: 'Шаг: число — ровная сетка от min, список допустимых значений — кодом',
		largeStep: 'Сколько шагов делают Shift со стрелкой, PageUp и PageDown',
		orientation: 'Ось хода: вдоль строки или снизу вверх',
		inverted: 'Значение растёт в обратную сторону: справа налево или сверху вниз',
		origin: 'Откуда растёт заливка одной ручки. Пусто — от min, середина хода — от центра',
		marks: 'Метки на рельсе — точки шкалы. Список с подписями задаётся кодом',
		minStepsBetweenThumbs: 'Наименьший зазор между соседними ручками — в шагах шкалы',
		snap: 'Щелчок: как метки притягивают ручку, которую тянут. magnet — в радиусе метки ручка на ней, plateau — метка занимает два радиуса хода, settle — отпущенная рядом доезжает до метки, hold — стоит на пересечённой метке и догоняет указатель',
		snapRadius: 'Радиус щелчка в px вдоль оси',
		tooltip:
			'Подсказка со значением у ручки: нет, видна, пока ручку наводят, держат, тянут или она в фокусе с клавиатуры (auto), или всегда',
	},
	popover: {
		open: 'Открыта ли панель. Закрывают её крестик, Escape, нажатие и фокус мимо и жест',
		closable: 'Показывать ли кнопку закрытия в углу панели',
		lazyMount:
			'Не монтировать содержимое, пока панель не открывали. Потом закрытие только прячет её',
		placement:
			'Сторона и выравнивание панели у триггера. У края окна сторону переворачивает flip',
		contained:
			'Панель внутри контейнера: не уходит в body, а прижимается к краю (edge) ближайшего позиционированного предка',
		edge: 'Край контейнера, к которому прижата панель внутри него. К нему её смахивают, полоса — у противоположного края. start и end меняются местами в RTL',
		swipe: 'За что панель можно смахнуть, чтобы закрыть: ни за что, за полосу или за любое место, кроме контролов. Смахивают от триггера, в контейнере — к её краю (edge)',
	},
	dialog: {
		visible:
			'Открыто ли окно. Закрывают его крестик, Escape и нажатие по подложке — через close:before',
		placement: 'Где стоит окно: по центру или у стороны. start и end меняются местами в RTL',
		offset: 'Отступ окна от краёв экрана: число — px, строка — CSS-значение, проценты — от экрана по своей оси. Пусто — отступ темы, 0 — вплотную. У центра — со всех сторон, у стороны — от её края; стороны по отдельности правит событие layout:offset:before',
		width: 'Ширина окна: число — px, строка — CSS-значение. Пусто — ширина темы, auto — по экрану с отступом, fit-content — по содержимому',
		height: 'Высота окна: число — px, строка — CSS-значение. Пусто и fit-content — по содержимому, auto — по экрану с отступом',
		maximized: 'Развёрнуто ли окно на весь экран. Его же переключает кнопка разворота',
		maximizable: 'Показывать ли кнопку разворота',
		closable: 'Показывать ли кнопку закрытия',
		dismissible:
			'Закрывают ли окно нажатие по подложке и Escape. Выключено — только кнопка закрытия и код',
		alert: 'Окно-предупреждение: роль alertdialog, описание — тело окна',
	},
	drawer: {
		visible:
			'Открыта ли панель. Закрывают её крестик, Escape, нажатие по подложке и жест — через close:before',
		placement:
			'У какого края экрана стоит панель. start и end меняются местами в RTL, жест зеркалится вместе с ними',
		width: 'Ширина панели у бокового края: число — px, строка — CSS-значение. Пусто — ширина темы',
		height: 'Высота панели у верхнего и нижнего края: число — px, строка — CSS-значение. Пусто — по содержимому',
		closable: 'Показывать ли кнопку закрытия',
		dismissible:
			'Закрывают ли панель нажатие по подложке и Escape. Выключено — только кнопка закрытия, жест и код',
		swipe: 'За что панель можно смахнуть к её краю, чтобы закрыть: ни за что, за полосу у края или за любое место, кроме контролов',
		contained:
			'Панель внутри своего контейнера, а не поверх страницы: встаёт в ближайшем позиционированном предке и не запирает прокрутку документа',
	},
	tooltip: {
		open: 'Показана ли подсказка. Прячут её уход курсора и фокуса, нажатие и Escape',
		placement:
			'Сторона и выравнивание подсказки у триггера: top и bottom — по центру. У края окна сторону переворачивает flip',
		openDelay:
			'Через сколько миллисекунд наведения подсказка показывается. Фокус с клавиатуры показывает сразу',
		closeDelay:
			'Через сколько миллисекунд после ухода курсора подсказка прячется. Курсор на ней самой её держит',
		type: 'Чем подсказка служит триггеру: описанием (aria-describedby) или именем (aria-labelledby) — для кнопки-иконки без текста',
	},
	'list-box': {
		view: 'Оформление списка',
	},
	table: {
		mode: 'Выбор строк: none — колонки выбора нет, single — одна строка, multiple — несколько и чекбокс «выбрать все»',
		sortMode:
			'Сколько колонок сортируют строки: single — сортировка по другой колонке заменяет прежнюю, multiple — встаёт следующей',
		presorted:
			'Строки приходят упорядоченными, например с сервера: таблица держит сортировку и отметки колонок, но строки не переставляет',
		grid: 'Режим сетки (APG Data Grid): одна остановка Tab, стрелки по ячейкам, строку выбирают нажатием и пробелом',
		stickyHead:
			'Закреплённая шапка: шапка стоит у верхнего края прокрутки — контейнера или страницы, — а строки уходят под неё. Без него шапка уезжает вместе со строками',
		columnFit:
			'Как колонки без своей ширины делят место: none — стоят в ширине по умолчанию, auto — растут до maxWidth во всю ширину таблицы, contain — ровно заполняют место, сжимаясь до minWidth. Не влезли и так — таблица прокручивается',
	},
	virtual: {
		enabled:
			'Окно включено: ListBox, Select и Table внутри рисуют только видимые элементы, остальные — распорками той же высоты. Высота элементов — одна на все; поиск по странице и печать видят только нарисованное',
	},
	tabs: {
		orientation: 'Как расположен список вкладок',
		alignment: 'Выравнивание вкладок вдоль списка',
		position: 'С какой стороны от панели стоит список вкладок',
		view: 'Оформление: линия, контейнер или папки',
		closable: 'Показывать ли у вкладок кнопку закрытия',
	},
	tags: {
		view: 'Оформление тегов — вид набора, тема применяет его к каждому тегу',
		closable: 'Показывать ли у тегов кнопку закрытия',
		overflow: 'Что делать с тегами, которым не хватило ширины: переносить или прокручивать',
	},
	accordion: {
		view: 'Оформление секций',
	},
	icon: {
		width: 'Ширина. Пусто — берётся из size',
		height: 'Высота. Пусто — берётся из size',
	},
	'progress-linear': {
		value: 'Сколько готово — число от min до max',
		min: 'Начало шкалы',
		max: 'Конец шкалы',
		indeterminate:
			'Доля неизвестна — полоса бежит. Значение при этом хранится и вернётся, когда бег снимут',
		orientation: 'Ось полосы: вдоль строки или снизу вверх',
	},
	'progress-spinner': {
		value: 'Сколько готово — число от min до max',
		min: 'Начало шкалы',
		max: 'Конец шкалы',
		indeterminate:
			'Доля неизвестна — кольцо бежит. Значение при этом хранится и вернётся, когда бег снимут',
	},
	skeleton: {
		shape: 'Форма заглушки',
		animation: 'Анимация ожидания',
		width: 'Ширина заглушки',
		height: 'Высота заглушки',
	},
	frame: {
		x: 'Смещение по горизонтали',
		y: 'Смещение по вертикали',
		width: 'Ширина слоя. `auto` — по содержимому',
		height: 'Высота слоя. `auto` — по содержимому',
		position: 'Способ позиционирования: в потоке страницы или относительно окна',
		contained:
			'Слой внутри контейнера: без телепорта и координат, место в ближайшем позиционированном предке задаёт тема',
	},
}

/**
 * Списки значений для перечислимых пропов.
 *
 * Ключ `*` — общие для всех; конкретный компонент перекрывает. Разделение
 * обязательно: `position` у Tabs и у Frame — разные перечисления, и общий
 * список подсунул бы вкладкам `fixed`.
 */
const OPTIONS: Record<string, Record<string, readonly string[]>> = {
	'*': {
		size: COMPONENT_SIZES,
		variant: COMPONENT_VARIANTS,
		direction: DIRECTIONS,
		tag: HTML_TAGS,
		// Из списочного контракта — имена уникальны, разночтений быть не может
		contentFit: LIST_CONTENT_FITS,
		scrollBehavior: SCROLL_BEHAVIORS,
		indicator: LIST_INDICATORS,
		// Коллекционный: один и тот же режим выбора у всех коллекций
		mode: SELECTION_MODES,
		// Плагинный — по имени с неймспейсом: оно уникально, и с `placement`
		// у Select общий список не столкнётся
		anchor_placement: FRAME_PLACEMENTS,
	},
	button: { view: BUTTON_VIEWS },
	'check-box': { view: CHECK_BOX_VIEWS },
	label: { position: LABEL_POSITIONS },
	accordion: { view: BUTTON_VIEWS },
	'list-box': { view: BUTTON_VIEWS },
	'radio-group': { view: RADIO_GROUP_VIEWS },
	select: {
		editableMode: SELECT_EDITABLE_MODES,
		placement: SELECT_PLACEMENTS,
		swipe: SWIPES,
		tags_overflow: TAGS_OVERFLOWS,
	},
	popover: { placement: POPOVER_PLACEMENTS, edge: POPOVER_EDGES, swipe: SWIPES },
	tooltip: { placement: TOOLTIP_PLACEMENTS, type: TOOLTIP_TYPES },
	slider: { orientation: SLIDE_ORIENTATIONS, snap: SLIDE_SNAPS, tooltip: SLIDER_TOOLTIPS },
	calendar: { mode: CALENDAR_MODES },
	'date-input': { kind: DATE_INPUT_KINDS, timePrecision: TIME_PRECISIONS },
	'date-picker': { mode: DATE_PICKER_MODES, swipe: SWIPES },
	'progress-linear': { orientation: PROGRESS_LINEAR_ORIENTATIONS },
	dialog: { placement: DIALOG_PLACEMENTS },
	drawer: { placement: DRAWER_PLACEMENTS, swipe: SWIPES },
	tabs: {
		view: TABS_VIEWS,
		orientation: TABS_ORIENTATIONS,
		alignment: TABS_ALIGNMENTS,
		position: TABS_POSITIONS,
	},
	tags: { view: BUTTON_VIEWS, overflow: TAGS_OVERFLOWS },
	table: { sortMode: TABLE_SORT_MODES, columnFit: TABLE_COLUMN_FITS },
	skeleton: { shape: SKELETON_SHAPES, animation: SKELETON_ANIMATIONS },
	frame: { position: FRAME_POSITIONS },
}

/**
 * Метки строк щелчка ползунка: редкие и с подписями на мелком шаге — там, где
 * плавную ручку трудно остановить ровно на метке. Точки шкалы (`marks: true`)
 * не годятся: с шагом 1 метка стоит на каждом значении, и щелчок ничего бы не
 * менял, а с шагом 10 ручке и так некуда встать, кроме метки.
 */
const SNAP_MARKS = [0, 25, 50, 75, 100].map((value) => ({ value, label: String(value) }))

/**
 * Что ещё выставить превью на строке пропа, чтобы сам проп было видно.
 *
 * Строка правит одно свойство, остальные остаются по умолчанию. Большинству
 * пропов этого хватает, но не тем, что раскрываются только в сочетании. Таких
 * случаев два:
 *
 * - без сочетания проп не делает ничего: `removeOnBackspace` без `editable` и
 *   `multiple` — строка показала бы переключатель, который ни на что не
 *   влияет;
 * - проп работает и сам, но зачем он нужен, видно только в сочетании:
 *   `indicator` у ListBox ставит отметку и при одиночном выборе, а смысл у неё
 *   там, где выбрано несколько элементов.
 *
 * Пресет — только для своей строки. Глобальный дефолт превью (как `editable`
 * у Select) перевёл бы в `multiple` и все соседние строки, а `closeOnSelect`
 * в одиночном выборе и во множественном выглядит по-разному.
 */
export const PRESETS: Record<string, Record<string, Record<string, unknown>>> = {
	select: {
		removeOnBackspace: { editable: true, mode: 'multiple' },
		// Теги в поле бывают только во множественном выборе, и переполняться
		// им нечем, пока ничего не выбрано: выбор строка делает сама, всем
		// составом сразу
		tags_overflow: { mode: 'multiple', value: COLLECTION_VALUES },
	},
	'list-box': {
		indicator: { mode: 'multiple' },
	},
	slider: {
		// Зазор — между соседями, а у одной ручки соседей нет
		minStepsBetweenThumbs: { value: [20, 80] },
		// Точки шкалы с шагом 1 — сотня точек впритык: рельс выглядел бы
		// сплошной штриховкой
		marks: { step: 10 },
		// Щелчку нужны метки, к которым притягивать: без них режим ничего не
		// делает
		snap: { marks: SNAP_MARKS },
		// Радиус без режима и меток ни на что не влияет
		snapRadius: { snap: 'magnet', marks: SNAP_MARKS },
	},
	'progress-linear': {
		// Шкала двигает долю, а у доли по умолчанию — нуля — двигать нечего:
		// пустая полоса пуста на любом `max`
		min: { value: 40 },
		max: { value: 40 },
		// Флаг главнее значения, и что значение под бегом хранится, видно
		// только на доле: снятый флаг возвращает её на полосу
		indeterminate: { value: 40 },
		// Ось видна и на пустой дорожке, а откуда растёт заливка — только на
		// доле
		orientation: { value: 40 },
	},
	'progress-spinner': {
		// Шкала двигает долю, а у доли по умолчанию — нуля — двигать нечего:
		// пустое кольцо пусто на любом `max`
		min: { value: 40 },
		max: { value: 40 },
		// Флаг главнее значения, и что значение под бегом хранится, видно
		// только на доле: снятый флаг возвращает её на кольцо
		indeterminate: { value: 40 },
	},
	'date-input': {
		// Точность времени у поля даты ничего не меняет: секунде нужна часть
		// времени
		timePrecision: { kind: 'datetime' },
	},
	dialog: {
		// Отступ — поля области, по центру которой стоит окно, а не сдвиг: окно
		// меньше экрана от равных отступов не двигается. Растянутое по области
		// (`auto` — «по экрану с отступом») показывает его зазором до краёв
		// экрана со всех четырёх сторон
		offset: { width: 'auto', height: 'auto' },
	},
}

export function presetForProp(componentId: string, prop: string): Record<string, unknown> {
	return PRESETS[componentId]?.[prop] ?? {}
}

/**
 * `ctrl` — не свойство компонента, а способ отдать ему готовый экземпляр ядра.
 * Стенд им и пользуется во второй колонке, поэтому в список редактируемых
 * пропов он не идёт.
 *
 * Ключ — имя из разметки, то же, что у описаний: у пропа плагина с неймспейсом.
 * `protected`-пропы сюда не вносятся — их снимает общий фильтр `propControls`.
 */
export const NON_EDITABLE = new Set([
	'ctrl',
	// Имя места детали чужой разметки — ставит библиотека, а не потребитель
	'embedded',
	// Значения для плагинов, поставленных снаружи: на стенде их нет, а сам
	// проп — объект по ключам этих плагинов, а не значение компонента
	'pluginProps',
	// Коллекционные: состав элементов задаёт само превью, а `trackBy` —
	// функция. Контрола, которым осмысленно править то и другое, не бывает
	'items',
	'trackBy',
	// Готовая коллекция снаружи — как `ctrl`, объект, а не значение
	'engine',
	// Якорь — DOM-элемент, как `ctrl` и `engine`: вводить в контрол нечего
	'anchor_anchor',
	// Атрибуты вьюпорта ленты от потребителя — набор, а не значение: роль ряда
	// приносит тот, кто ленту применяет, и текстовым полем его не задать
	'viewportAria',
	// Имена ручек ползунка — список строк по числу ручек, а у превью ручка одна
	'thumbLabels',
	// Недоступные дни календаря — функция от даты, контрола для неё не бывает
	'unavailable',
	// Месяцы сеток календаря — список дат по числу сеток; листание пишет их само
	'months',
	// Колонки таблицы — список записей с полями, ширинами и сравнением, как
	// `items`: их задаёт само превью
	'columns',
	// Сортировка таблицы — список колонок с направлениями; пишут её заголовки
	'sort',
])

export function describeProp(componentId: string, prop: string): string | undefined {
	return OWN[componentId]?.[prop] ?? SHARED[prop] ?? PLUGIN[prop]
}

export function optionsForProp(componentId: string, prop: string): readonly string[] | undefined {
	return OPTIONS[componentId]?.[prop] ?? OPTIONS['*'][prop]
}

/**
 * Имена конструкторов пропа по порядку объявления.
 *
 * В декларации `type` встречается в двух видах: сам конструктор (`String`) и
 * массив конструкторов (`tag: [String, Object]`) — массив описывает
 * объединение. Обёртки `defineType` у пропа нет: она несёт тип данных scope
 * слота, а тип значения пропа даёт интерфейс ядра.
 */
function ctorNames(type: unknown): string[] {
	if (Array.isArray(type)) return type.flatMap(ctorNames)

	return typeof type === 'function' ? [type.name] : []
}

/**
 * Тип пропа — ровно `Number` и `String`, в любом порядке: у Dialog
 * `[Number, String]`, у Icon `[String, Number]`.
 *
 * Ровно, а не «среди типов есть String»: под такое правило попал бы `value`
 * у `ValueControl` (`[String, Number, Boolean, Object, Array]`), и набранное
 * «42» у Input уходило бы числом.
 */
function isNumberOrText(names: readonly string[]): boolean {
	return names.length === 2 && names.includes('Number') && names.includes('String')
}

/**
 * Чем редактировать проп — выводится, а не задаётся руками.
 *
 * Порядок важен: список значений сильнее типа. `view` объявлен как `String`,
 * но редактировать его текстовым полем бессмысленно — вариантов четыре.
 * Дальше решает первый конструктор, кроме объединения ровно `Number` и
 * `String`: ему числовое поле не годится — `10%` и `auto` оно превратило бы в
 * `NaN`, — а текстовое отдало бы и `40` строкой.
 */
export function controlKind(componentId: string, prop: TPropSpec): TControlKind {
	if (optionsForProp(componentId, underscorePropNaming(prop.name))) return 'select'

	const names = ctorNames(prop.type)

	if (names[0] === 'Boolean') return 'switch'
	if (isNumberOrText(names)) return 'number-or-text'
	if (names[0] === 'Number') return 'number'

	return 'text'
}

/**
 * Полное описание контрола для одного пропа.
 *
 * Умолчание — из самой декларации: его кладёт туда setup при сборке дескриптора
 * (`withClassDefault`, у пропа плагина — `definePlugin`), и своего пути к
 * `defaultValues` стенду больше не нужно. Заодно уходит старая натяжка:
 * умолчания компонента подставлялись и пропам фасада коллекции, у которого
 * свой класс.
 *
 * Значим ключ, а не значение — ровно как в setup: `closable` у элемента Tabs и
 * Tags объявлен с умолчанием `undefined`, и проверка `!== undefined` спутала бы
 * его с пропом, у которого умолчания нет вовсе.
 *
 * Имя — то, которым проп пишут в разметке (`underscorePropNaming`). У пропов
 * компонента и коллекции оно совпадает с именем из декларации, а плагинные
 * перестают сталкиваться с одноимёнными: `placement` есть и у Select, и у
 * якоря. По этому же имени ищутся описание, список значений и пресет.
 */
export function propControl(
	componentId: string,
	prop: TPropSpec,
	owner: TPropOwner = { scope: 'component' },
): TPropControl {
	const name = underscorePropNaming(prop.name)

	const control: TPropControl = {
		...owner,
		name,
		kind: controlKind(componentId, prop),
		options: optionsForProp(componentId, name),
		description: describeProp(componentId, name) ?? '',
		preset: presetForProp(componentId, name),
	}

	if (Object.hasOwn(prop, 'default')) control.default = prop.default

	return control
}

/**
 * Пусто ли поле контрола — это «проп не задан», а не пустое значение.
 *
 * Стёртое текстовое поле даёт `''`, стёртые числовое и «число или текст» и
 * снятый выбор списка — `undefined`. Проверка одна на обе колонки и код под
 * ними: разметка такой проп не передаёт, экземпляр получает умолчание
 * декларации, в коде его нет вовсе, и разойдись проверки — колонки и код
 * показали бы разное.
 */
export function isEmptyField(value: unknown): boolean {
	return value === undefined || value === ''
}

/**
 * Значение поля «число или текст» (`number-or-text`) по набранному тексту.
 *
 * - пусто после `trim` — `undefined`: проп не задан, как у числового поля;
 * - конечное число в каноническом виде — то, что `String()` от этого числа
 *   вернёт тем же текстом (`40`, `-5`, `1.5`), — число;
 * - всё остальное — строка как набрана: `10%`, `2rem`, `auto`.
 *
 * Каноничность главное: поле перерисовывается из значения, и `1.50`, `007` или
 * `1.` иначе переписывались бы прямо под пальцем — в `1.5`, `7` и `1`. Пока
 * текст не канонический, он остаётся строкой и доходит до компонента как есть.
 *
 * Живёт здесь, а не в разметке оболочки: правило поля — данные стенда, а не
 * его отрисовка, и проверяется без фреймворка (`__tests__/props.spec.ts`).
 */
export function parseNumberOrText(text: string): number | string | undefined {
	if (text.trim() === '') return undefined

	const number = Number(text)

	return Number.isFinite(number) && String(number) === text ? number : text
}

/**
 * Есть ли у пропа строка на странице.
 *
 * `protected` — вычисляемые наружу значения (`classes`, `aria`, `dataset`,
 * `present`, `styles` плагинов раскладки): обмен их не пишет вовсе, и
 * контрол для них был бы обманом. `NON_EDITABLE` — по имени из разметки.
 */
function isEditable(prop: TPropSpec): boolean {
	return !prop.protected && !NON_EDITABLE.has(underscorePropNaming(prop.name))
}

/**
 * По алфавиту: порядок объявления идёт от слоя наследования, а не от смысла, и
 * искать в нём глазами дольше, чем прочитать список.
 */
function byName(a: TPropControl, b: TPropControl): number {
	return a.name.localeCompare(b.name)
}

/**
 * Строки страницы компонента по группам владельцев.
 *
 * Один источник на всех, кто считает строки: страницу, проверку манифеста и
 * дымовой тест. Пока фильтр был продублирован в каждом, плагинные пропы
 * разошлись бы по ним наверняка.
 *
 * Плагинные — из `descriptor.plugins`, а не из плоского `getProps()`: он не
 * говорит, какому плагину проп принадлежит, а без адреса второй колонке некуда
 * его записать. Плагины есть только у компонентного дескриптора: фасад
 * коллекции работает с bundle компонента.
 */
export function propControls(entry: TComponentEntry): TPropControlGroups {
	const descriptor = entry.descriptor()
	const collectionProps = entry.collectionDescriptor?.().props ?? []

	return {
		componentControls: descriptor.props
			.filter(isEditable)
			.map((prop) => propControl(entry.id, prop))
			.sort(byName),
		collectionControls: collectionProps
			.filter(isEditable)
			.map((prop) => propControl(entry.id, prop, { scope: 'collection' }))
			.sort(byName),
		pluginControls: descriptor.plugins
			.flatMap(({ ctor, props }) =>
				props.filter(isEditable).map((prop) =>
					propControl(entry.id, prop, {
						scope: 'plugin',
						plugin: { ctor, name: prop.name.name },
					}),
				),
			)
			.sort(byName),
	}
}
