import { defineComponent, h, mergeProps, ref, watch, type Component } from 'vue'
import type { IToastOptions, TToastsItemType } from '@soldy-ui/core'
import type {
	DescriptorSlots,
	MenuDescriptor,
	PopoverDescriptor,
	TooltipDescriptor,
} from '@soldy-ui/setup'
import {
	COLLECTION_ITEMS,
	COLLECTION_MANY_ITEMS,
	TABLE_COLUMNS,
	TABLE_MANY_ROWS,
	TABLE_ROWS,
	TABLE_SCROLL_ROWS,
	TOASTS_ITEM_TYPES,
} from '@soldy-ui/playground-shared'
import {
	Accordion,
	Button,
	Calendar,
	CheckBox,
	ComponentView,
	DateInput,
	DatePicker,
	Dialog,
	DragAndDrop,
	Drawer,
	Field,
	Icon,
	Input,
	Label,
	ListBox,
	Menu,
	NumberInput,
	Pagination,
	Popover,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	Rating,
	Scroller,
	Select,
	Skeleton,
	Slider,
	Switch,
	Table,
	Tabs,
	Tags,
	Textarea,
	Toasts,
	Tooltip,
	Virtual,
	roleIcon,
	useToasts,
	type TToastRender,
} from '@soldy-ui/vue'

/**
 * Как рисовать компонент на стенде — во Vue.
 *
 * Страница компонента универсальна — она строится из дескриптора и о самих
 * компонентах ничего не знает. Но нарисовать `Tabs` без вкладок нельзя, а
 * `Button` без текста бессмысленно: **содержимое — не свойство, его из
 * метаданных не достать**. Эта карта и есть недостающая часть, и она
 * фреймворкозависима, поэтому лежит в хосте фреймворка, а не в общем пакете.
 * Ключи — идентификаторы реестра, одни на все хосты.
 *
 * Функция получает готовые атрибуты (`bind`) и рисует ими компонент. Одна и та
 * же функция обслуживает обе колонки: в первой в `bind` лежат пропы, во второй
 * — `ctrl` с экземпляром ядра. Слушатели событий кладёт туда же хост.
 *
 * Значений пропов самого компонента — подписи кнопки, плейсхолдера поля —
 * здесь нет: это данные, одни на все хосты (`PREVIEW_PROPS` в общем пакете), и
 * в `bind` их кладёт оболочка. Здесь — обёртка и содержимое.
 */
export type TPreview = (bind: Record<string, unknown>) => unknown

/** Scope слота `trigger` у Popover — из объявления слота в дескрипторе. */
type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Scope слота `trigger` у Tooltip — ссылка триггера на панель. */
type TTooltipTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

/** Scope слота `trigger` у Menu — связка кнопки с меню и вид «нажата». */
type TMenuTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/**
 * Содержимое коллекций — из общего манифеста: состав нужен не только здесь.
 * Пресеты строк тоже им пользуются (`tags_overflow` у Select выбирает всё).
 */
const ITEMS = COLLECTION_ITEMS

/**
 * Пункты меню разметкой: группа флажков с подписью, группа переключателей —
 * отмечен один, — действия с подсказками сочетаний, подменю с подменю внутри,
 * пункт с панелью — календарём, который монтируется с первым открытием, —
 * выключенное действие и «опасный» пункт своего варианта.
 */
const menuItems = () => [
	h(Menu.Group, { label: 'Вид' }, () => [
		h(Menu.CheckboxItem, { value: 'grid', text: 'Сетка', selected: true }),
		h(Menu.CheckboxItem, { value: 'ruler', text: 'Линейка' }),
	]),
	h(Menu.Separator),
	h(Menu.RadioGroup, { label: 'Сортировка', value: 'name' }, () => [
		h(Menu.RadioItem, { value: 'name', text: 'По имени' }),
		h(Menu.RadioItem, { value: 'date', text: 'По дате' }),
	]),
	h(Menu.Separator),
	h(Menu.Item, { value: 'edit', text: 'Изменить' }, { trailing: () => 'Ctrl+E' }),
	h(Menu.Item, { value: 'copy', text: 'Дублировать' }, { trailing: () => 'Ctrl+D' }),
	h(Menu.Submenu, { value: 'share', text: 'Поделиться' }, () => [
		h(Menu.Item, { value: 'link', text: 'Ссылка' }),
		h(Menu.Item, { value: 'mail', text: 'Почта' }),
		h(Menu.Submenu, { value: 'messengers', text: 'Мессенджеры' }, () => [
			h(Menu.Item, { value: 'telegram', text: 'Telegram' }),
			h(Menu.Item, { value: 'whatsapp', text: 'WhatsApp' }),
		]),
	]),
	h(Menu.PopoverItem, { value: 'due', text: 'Срок', lazyMount: true }, () =>
		h(Calendar as Component),
	),
	h(Menu.Item, { value: 'archive', text: 'В архив', disabled: true }),
	h(Menu.Separator),
	h(
		Menu.Item,
		{ value: 'remove', text: 'Удалить', variant: 'negative' },
		{ trailing: () => 'Del' },
	),
]

/**
 * Иконка превью Icon.
 *
 * `tag` у Icon — корень: тег или компонент, и глиф рисует компонент
 * `roleIcon(роль)`. Строка с ролью (`tag: 'arrowDown'`) давала пустой
 * элемент `<arrowdown>`, и ячейка Icon на витрине была пустой. Компонент
 * строится один раз: новый на каждый рендер Vue пересоздавал бы узел.
 */
const ARROW_DOWN = roleIcon('arrowDown')

/**
 * Окно на стенде открывает кнопка: закрытое оно спрятано, а открытое
 * накрывает страницу подложкой, и показывать его сразу было бы нечестно по
 * отношению к остальной странице.
 *
 * Открытость — `v-model:visible` на своём состоянии: крестик, Escape и
 * подложка закрывают окно через `update:visible`, а строка `visible` задаёт
 * его снаружи. Состояние держит компонент — у функции отрисовки его нет. С
 * экземпляром ядра (вторая колонка) путь тот же: запись в `visible`
 * инстанса открывает окно, и `update:visible` доезжает сюда. Обработчики
 * страницы (журнал событий) склеиваются со своим `mergeProps`, а не
 * затираются им.
 */
const DialogPreview = defineComponent({
	name: 'DialogPreview',
	inheritAttrs: false,
	props: { visible: { type: Boolean, default: false } },
	setup(props, { attrs }) {
		const shown = ref(props.visible)

		watch(
			() => props.visible,
			(value) => {
				shown.value = value
			},
		)

		const setShown = (value: boolean) => {
			shown.value = value
		}

		return () => [
			h(Button, { text: 'Открыть окно', onClick: () => setShown(true) }),
			h(
				Dialog as Component,
				mergeProps(attrs, { visible: shown.value, 'onUpdate:visible': setShown }),
				{
					title: () => 'Настройки',
					default: () => [
						h(
							'p',
							{ style: 'margin:0 0 8px' },
							'Произвольное содержимое: текст, поля, кнопки',
						),
						h(Input, { placeholder: 'Имя' }),
					],
					footer: () => [
						h(Button, { text: 'Отмена', onClick: () => setShown(false) }),
						h(Button, { text: 'Сохранить', onClick: () => setShown(false) }),
					],
				},
			),
		]
	},
})

/**
 * Выезжающую панель на стенде тоже открывает кнопка — по той же причине, что
 * окно, и на том же своём состоянии (`v-model:visible`, см. `DialogPreview`).
 *
 * Кнопка и панель лежат в своей коробке с `position: relative`: с
 * `contained` панель не телепортируется, а встаёт в ближайшем
 * позиционированном предке, и строка `contained` показывает её в коробке
 * превью, а не у края всей страницы.
 */
const DrawerPreview = defineComponent({
	name: 'DrawerPreview',
	inheritAttrs: false,
	props: { visible: { type: Boolean, default: false } },
	setup(props, { attrs }) {
		const shown = ref(props.visible)

		watch(
			() => props.visible,
			(value) => {
				shown.value = value
			},
		)

		const setShown = (value: boolean) => {
			shown.value = value
		}

		return () =>
			h(
				'div',
				{ style: 'position:relative; width:100%; min-height:240px; overflow:hidden' },
				[
					h(Button, { text: 'Открыть панель', onClick: () => setShown(true) }),
					h(
						Drawer as Component,
						mergeProps(attrs, { visible: shown.value, 'onUpdate:visible': setShown }),
						{
							title: () => 'Фильтры',
							default: () => [
								h(
									'p',
									{ style: 'margin:0 0 8px' },
									'Произвольное содержимое: текст, поля, кнопки',
								),
								h(Input, { placeholder: 'Поиск' }),
							],
							footer: () => [
								h(Button, { text: 'Сбросить', onClick: () => setShown(false) }),
								h(Button, { text: 'Применить', onClick: () => setShown(false) }),
							],
						},
					),
				],
			)
	},
})

/** Своё содержимое тоста — кнопка «Отменить»: тост приходит ей пропом и закрывается ею. */
const ToastUndo: TToastRender = ({ toast }) =>
	h(Button, { text: 'Отменить', onClick: () => toast.close() })

/** Обычное сообщение — тост без вида: значок у него свой, нейтральный. */
const TOAST_NORMAL: IToastOptions<TToastRender> = { text: 'Черновик сохранён', render: ToastUndo }

/**
 * Что сообщает тост каждого вида — чтобы значок читался рядом с текстом.
 * Срочный (`alert`) — ошибка, своё содержимое — у успеха и обычного: так на
 * странице видно и обе роли, и кнопку «Отменить».
 */
const TOAST_SAMPLES = {
	info: { text: 'Вышла новая версия', description: 'Обновится при следующем входе' },
	success: { text: 'Письмо отправлено', render: ToastUndo },
	warning: { text: 'Место почти закончилось', description: 'Свободно 200 МБ из 15 ГБ' },
	error: { text: 'Нет сети', description: 'Изменения сохранятся позже', alert: true },
} satisfies Record<TToastsItemType, IToastOptions<TToastRender>>

/** Сколько «Сохраняем…» ждёт, прежде чем тот же тост сообщит итог, мс. */
const TOAST_SAVING = 2000

/**
 * Тосты приходят из кода, а не из разметки: кнопки внутри менеджера берут API
 * (`useToasts()`) и показывают тост. Менеджер оборачивает их, как приложение,
 * а регион с тостами — телепортом у края окна, вне ячейки превью.
 *
 * Кнопка — на обычное сообщение и на каждый вид (`TOASTS_ITEM_TYPES`): тост
 * показывает значок своего вида. Строки свойств правят менеджер, а вида у него
 * нет и быть не должно: вид у каждого тоста свой, его задаёт `show`. Текст
 * начинается с номера: в стопке видно, какой тост где.
 *
 * Последняя кнопка — ожидание: «Сохраняем…» с кольцом на месте значка
 * (`loading`) сам не закрывается, а через пару секунд тот же тост сообщает
 * успех — снятое ожидание начинает отсчёт. Ряд кнопок — с переносом: в ячейку
 * витрины шесть кнопок одной строкой не встают.
 */
const ToastsTrigger = defineComponent({
	name: 'ToastsTrigger',
	setup() {
		const { show } = useToasts()
		let count = 0

		const notify = (type?: TToastsItemType) => {
			const sample = type ? TOAST_SAMPLES[type] : TOAST_NORMAL

			count += 1
			show({ ...sample, text: `${count}. ${sample.text}`, type })
		}

		// Работа идёт — тост ждёт; кончилась — тот же тост сообщает итог
		const save = () => {
			count += 1

			const toast = show({ text: `${count}. Сохраняем…`, loading: true })
			const done = `${count}. Сохранено`

			setTimeout(() => {
				if (!toast) return

				toast.loading = false
				toast.type = 'success'
				toast.text = done
			}, TOAST_SAVING)
		}

		return () =>
			h('div', { style: 'display:flex; flex-wrap:wrap; gap:8px' }, [
				h(Button, { key: 'normal', text: 'обычное', onClick: () => notify() }),
				...TOASTS_ITEM_TYPES.map((type) =>
					h(Button, { key: type, text: type, onClick: () => notify(type) }),
				),
				h(Button, { key: 'loading', text: 'загрузка → готово', onClick: save }),
			])
	},
})

/** Слои наследования: у них нет своей разметки, показываем пустую коробку. */
const layer =
	(label: string): TPreview =>
	(bind) =>
		h(ComponentView, bind, { default: () => label })

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не слот: заданный слот
	// `default` перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: (bind) => h(Button, bind),

	input: (bind) => h(Input, bind),
	'number-input': (bind) => h(NumberInput, bind),

	textarea: (bind) => h(Textarea, bind),

	// Текста у чекбокса и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': (bind) => h(Label, { text: 'Согласен' }, () => h(CheckBox, bind)),

	switch: (bind) => h(Label, { text: 'Включено' }, () => h(Switch, bind)),

	// Подпись — проп `text` из пропсов превью, контрол — слотом. Строки
	// страницы правят саму подпись: сторону, размер текста, вариант
	label: (bind) => h(Label, bind, () => h(CheckBox)),

	// Поле формы вокруг Input: тексты частей — пропсы превью, контрол —
	// слотом. Строки страницы правят само поле: сторону подписи, тексты, ошибку
	field: (bind) => h(Field, bind, () => h(Input, { placeholder: 'name@example.com' })),

	// Имени у ползунка нет, как у чекбокса: видимое даёт подпись Label, над
	// ползунком. Горизонтальный тянется на её ширину, вертикальный — своей высоты
	slider: (bind) => h(Label, { text: 'Громкость', position: 'top' }, () => h(Slider, bind)),

	// Имени у оценки нет, как у ползунка: видимое даёт подпись Label над звёздами
	rating: (bind) => h(Label, { text: 'Оценка', position: 'top' }, () => h(Rating, bind)),

	// Подпись — слотом: текста у радио нет, оно голый контрол, как CheckBox
	'radio-group': (bind) =>
		h(RadioGroup as Component, bind, () =>
			ITEMS.map((item) =>
				h(RadioGroup.Item, { key: item.value, value: item.value }, () => item.text),
			),
		),

	// Опции — разметкой, а пришли данными (`items` блока групп страницы) — из
	// них: разметка заменила бы данные, а группы Select рисует из данных
	select: (bind) =>
		h(
			Select as Component,
			bind,
			bind.items
				? undefined
				: () => ITEMS.map((item) => h(Select.Item, { key: item.value, ...item })),
		),

	// Содержимого у календаря нет: дни кладёт в коллекцию вид по месяцам
	// сеток. Языка у превью нет: это локаль провайдера вокруг корня хоста —
	// выбор языка в шапке (`setLocale` хоста)
	calendar: (bind) => h(Calendar as Component, bind),

	// Язык — из шапки стенда, как у календаря
	'date-input': (bind) => h(DateInput, bind),

	// Поле и календарь — экземпляры DatePicker, содержимого у него нет. Язык —
	// из шапки стенда, как у поля и календаря
	'date-picker': (bind) => h(DatePicker, bind),

	// Триггер — Button, связку с панелью и вид «нажат» он берёт из scope
	// слота. В содержимом есть кнопка: на неё при открытии уходит фокус
	popover: (bind) =>
		h(Popover as Component, bind, {
			trigger: ({ triggerAria, triggerDataset }: TPopoverTriggerScope) =>
				h(Button, { text: 'Открыть', ...triggerAria, ...triggerDataset }),
			default: () => [
				h('p', { style: 'margin:0 0 8px' }, 'Произвольное содержимое: текст, поля, кнопки'),
				h(Button, { text: 'Действие' }),
			],
		}),

	// Триггер — Button, связку с меню и вид «нажата» он берёт из scope слота.
	// У контекстного меню (`openOn: 'contextmenu'`) в слоте область, как
	// «файл» у потребителя: меню вызывают над ней правой кнопкой, долгим
	// касанием и Shift+F10 — она фокусируемая, — и панель встаёт у точки
	// вызова. Режим область берёт из пропсов колонки, как таблица своё окно:
	// у колонки экземпляра его нет, и там меню вызывают над кнопкой. Пункты —
	// разметкой: группа флажков с подписью, действия с подсказками сочетаний,
	// подменю с подменю внутри, пункт с панелью — календарём, который
	// монтируется с первым открытием, — выключенное действие и «опасный» пункт
	// своего варианта. Пришли данными (`items` блока групп страницы) — из них:
	// разметка заменила бы данные, а группы меню рисует из данных
	menu: (bind) =>
		h(Menu as Component, bind, {
			trigger: ({ triggerAria, triggerDataset }: TMenuTriggerScope) =>
				bind.openOn === 'contextmenu'
					? h(
							'div',
							{
								tabindex: 0,
								style: 'padding:24px 32px;border:1px dashed;border-radius:8px',
							},
							'Правая кнопка, долгое касание или Shift+F10',
						)
					: h(Button, { text: 'Действия', ...triggerAria, ...triggerDataset }),
			...(bind.items ? {} : { default: menuItems }),
		}),

	// Триггер — Button, ссылку на панель (`aria-describedby`) он берёт из
	// scope слота. Текст подсказки — слотом: пропа текста у неё нет
	tooltip: (bind) =>
		h(Tooltip as Component, bind, {
			trigger: ({ triggerAria }: TTooltipTriggerScope) =>
				h(Button, { text: 'Наведи', ...triggerAria }),
			default: () => 'Короткое пояснение к кнопке',
		}),

	// Кнопка открывает окно, окно — на своём состоянии (см. `DialogPreview`)
	dialog: (bind) => h(DialogPreview, bind),

	// Кнопка открывает панель, панель — на своём состоянии (см. `DrawerPreview`)
	drawer: (bind) => h(DrawerPreview, bind),

	// Менеджер оборачивает кнопки, которые показывают тосты, — по кнопке на
	// вид сообщения и кнопка ожидания (см. `ToastsTrigger`)
	toasts: (bind) => h(Toasts as Component, bind, { default: () => h(ToastsTrigger) }),

	/**
	 * Содержимое ленты — просто разметка: коллекции у неё нет, и делить ей
	 * нечего. Каждый элемент — прямой ребёнок вьюпорта: по ним тема ставит
	 * точки снапа, а плагин считает края.
	 *
	 * Обёртка — граница ширины, та же ловушка, что у превью Tags: сцена ячейки
	 * флексбокс, у флекс-элемента автоминимум равен содержимому, и лента с
	 * шириной по содержимому вылезла бы за колонку целиком — листать стало бы
	 * нечего.
	 */
	scroller: (bind) =>
		h('div', { style: 'width:100%' }, [
			h(Scroller as Component, bind, () =>
				ITEMS.map((item) =>
					h(
						'span',
						{ key: item.value, style: 'padding:4px 12px; white-space:nowrap' },
						`${item.text} пункт ленты`,
					),
				),
			),
		]),

	// Элементы — разметкой, а пришли данными (`items` блока групп страницы) —
	// из них: разметка заменила бы данные, а группы список рисует из данных
	'list-box': (bind) =>
		h(
			ListBox as Component,
			bind,
			bind.items
				? undefined
				: () => ITEMS.map((item) => h(ListBox.Item, { key: item.value, ...item })),
		),

	/**
	 * Содержимого у пагинации нет: страницы окна кладёт в коллекцию она сама.
	 * Язык номеров и имён стрелок — из шапки стенда.
	 */
	pagination: (bind) => h(Pagination as Component, bind),

	/**
	 * Строки и колонки — данными (`items`, `columns`): частей разметкой у
	 * таблицы нет, заголовки и строки она рисует сама.
	 *
	 * Обёртка — граница ширины, как у ленты: таблица встаёт во всю ширину
	 * места, а сцена ячейки — флексбокс, и таблица держала бы там только свой
	 * минимум. С закреплённой шапкой (`stickyHead`) обёртка — ещё и окно
	 * прокрутки высотой 320 px, а строк сорок (`TABLE_SCROLL_ROWS`): на пяти
	 * строках не видно шапки, под которую уходят строки. Строки — данными
	 * превью, а не пресетом строки: `items` в редакторе пропов нет. Окно
	 * таблицы — на странице Virtual.
	 */
	table: (bind) =>
		h(
			'div',
			{ style: bind.stickyHead ? 'width:100%;height:320px;overflow:auto' : 'width:100%' },
			[
				h(Table as Component, {
					items: bind.stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS,
					columns: TABLE_COLUMNS,
					...bind,
				}),
			],
		),

	tabs: (bind) =>
		h(Tabs as Component, bind, {
			// Первый таб активен сразу — иначе ни одна панель не смонтируется
			// (`rendered && active`), и стенд никогда не покажет содержимое
			default: () =>
				ITEMS.map((item, index) =>
					h(Tabs.Item, { key: item.value, active: index === 0, ...item }),
				),
			content: () =>
				ITEMS.map((item) =>
					h(Tabs.Content, { key: `c-${item.value}`, value: item.value }, () =>
						h('div', { style: 'padding:12px' }, `Панель «${item.text}»`),
					),
				),
		}),

	/**
	 * Обёртка — граница ширины: ряд обязан быть ровно по ячейке, иначе
	 * `overflow` не срабатывает вовсе.
	 *
	 * Ширина — явная, `100%`. Сцена ячейки (`.pg-col__stage`) — флексбокс, а у
	 * флекс-элемента автоминимум равен его содержимому: с шириной по
	 * содержимому ряд держал свои 516px в колонке шириной 214 — теги уходили
	 * за край, а прокрутка в `scroll` не появлялась, потому что прокручивать
	 * было нечего.
	 *
	 * Обрезка — не её дело: ряд в `scroll` прокручивает, в `wrap` переносит
	 * (`themes/oren/.../_tags.scss`).
	 *
	 * Сторожит `browser/tags-preview.spec.ts` — на самой странице стенда.
	 */
	tags: (bind) =>
		h('div', { style: 'width:100%' }, [h(Tags as Component, { items: ITEMS, ...bind })]),

	accordion: (bind) =>
		h(Accordion as Component, bind, () =>
			ITEMS.map((item) =>
				h(Accordion.Item, { key: item.value, ...item }, () =>
					h('div', { style: 'padding:4px 0' }, `Содержимое «${item.text}»`),
				),
			),
		),

	icon: (bind) => h(Icon, { tag: ARROW_DOWN, ...bind }),

	/**
	 * Длину горизонтальной полосе даёт контейнер, своей у неё нет. Обёртка —
	 * граница ширины, как у ленты: сцена ячейки — флексбокс, и полоса держала
	 * бы там только свой минимум. Вертикальная — строчный блок своей высоты,
	 * и обёртка ей не мешает.
	 *
	 * По умолчанию полоса пуста: доля — ноль, а бег — флаг `indeterminate`.
	 */
	'progress-linear': (bind) => h('div', { style: 'width:100%' }, [h(ProgressLinear, bind)]),

	/**
	 * Кольцо строчное и своего размера: обёртка по ширине ему не нужна. По
	 * умолчанию оно пусто — доля ноль, а бег — флаг `indeterminate`.
	 */
	'progress-spinner': (bind) => h(ProgressSpinner, bind),

	skeleton: (bind) => h(Skeleton, bind),

	'drag-and-drop': (bind) =>
		h(DragAndDrop as Component, bind, () =>
			ITEMS.map((item) =>
				h('div', { key: item.value, style: 'padding:6px 10px' }, item.text),
			),
		),

	/**
	 * Окно на трёх списках по тысяче элементов: на пяти его не видно. ListBox
	 * с пределом строк прокручивается сам, у Select прокручивается список его
	 * панели, Table — в обёртке высотой 320 px. Строка `enabled` включает и
	 * выключает окно у всех разом. Элементы — данными (`items`): элементы
	 * разметкой окно не прячет.
	 *
	 * Ряд — граница ширины, как у ленты: сцена ячейки — флексбокс, и без неё
	 * таблица держала бы там только свой минимум. Select — в колонке своей
	 * ширины: поле во всю ширину места, и в ряду оно забрало бы место таблицы.
	 *
	 * Переставленную колонку таблица здесь ведёт целиком, с ячейками строк
	 * (`reorderPreview: 'column'`): в окне это сотни ячеек, а не тысячи.
	 */
	virtual: (bind) =>
		h(Virtual as Component, bind, () =>
			h('div', { style: 'display:flex; gap:24px; align-items:flex-start; width:100%' }, [
				h(ListBox as Component, {
					items: COLLECTION_MANY_ITEMS,
					maxRows: 8,
					aria_label: 'Пункты',
				}),
				h('div', { style: 'flex:none; width:220px' }, [
					h(Select as Component, {
						items: COLLECTION_MANY_ITEMS,
						placeholder: 'Выберите',
					}),
				]),
				h('div', { style: 'flex:1; min-width:0; height:320px; overflow:auto' }, [
					h(Table as Component, {
						items: TABLE_MANY_ROWS,
						columns: TABLE_COLUMNS,
						reorderPreview: 'column',
						aria_label: 'Сотрудники',
					}),
				]),
			]),
		),

	frame: (bind) =>
		h(ComponentView, bind, { default: () => 'Frame показывается на своей странице' }),

	'component-view': layer('ComponentView'),
	control: layer('Control'),
	stylable: layer('Stylable'),
	textable: layer('Textable'),
	interactive: layer('Interactive'),
	'value-control': layer('ValueControl'),
	'input-control': layer('InputControl'),
}

/**
 * Функции отрисовки как компоненты — их рисует корень хоста.
 *
 * Обёртки строятся один раз при загрузке модуля, а не на каждый рендер: новая
 * функция на каждом обращении — это новый тип компонента, и Vue пересоздавал бы
 * поддерево вместо обновления, теряя состояние и ломая анимации. Так же
 * обёрнуты и фикстуры сценариев.
 *
 * Пропы не объявлены намеренно: всё, что передали, попадает в `attrs`, и превью
 * получает набор целиком — от `size` до `ctrl`.
 */
export function toComponents(previews: Record<string, TPreview>): Record<string, Component> {
	return Object.fromEntries(
		Object.entries(previews).map(([id, render]) => [
			id,
			(_props: unknown, { attrs }: { attrs: Record<string, unknown> }) => render(attrs),
		]),
	)
}

/** Превью как компоненты. */
export const PREVIEW_COMPONENTS: Record<string, Component> = toComponents(PREVIEWS)
