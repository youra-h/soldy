import { useRef, useState, type ReactNode } from 'react'
import type { TToastsItemType } from '@soldy-ui/core'
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
	TOAST_SAVING,
	toastSample,
} from '@soldy-ui/playground-shared'
import {
	Accordion,
	Button,
	CheckBox,
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
	Skeleton,
	Slider,
	Switch,
	Table,
	Tabs,
	Textarea,
	Toasts,
	Tooltip,
	Virtual,
	roleIcon,
	useToasts,
	type TToastRender,
} from '@soldy-ui/react'

/**
 * Как рисовать компонент на стенде — в React.
 *
 * Та же карта, что у хоста Vue (`hosts/vue/previews.ts`), и с теми же ключами
 * — идентификаторами реестра: содержимое не свойство, из метаданных его не
 * достать, а разметка у каждого фреймворка своя. Превью то же самое, что у
 * Vue, чтобы колонки двух фреймворков можно было сравнивать глазами.
 *
 * Функция получает готовые пропсы (`bind`) и рисует ими компонент: в первой
 * колонке там пропы, во второй — `ctrl` с экземпляром ядра, у обеих —
 * колбэки событий, которые кладёт хост. Значения пропов самого компонента —
 * подпись кнопки, плейсхолдер поля — данные, одни на все хосты
 * (`PREVIEW_PROPS` в общем пакете), и в `bind` их кладёт оболочка. Здесь —
 * обёртка и содержимое.
 *
 * Слоёв и `frame` здесь нет: во Vue это ComponentView с чужими пропами, а в
 * React чужой проп ушёл бы атрибутом в корень, и React предупредил бы о нём.
 */
export type TPreview = (bind: Readonly<Record<string, unknown>>) => ReactNode

/** Содержимое коллекций — из общего манифеста, как у Vue. */
const ITEMS = COLLECTION_ITEMS

/** Глиф превью Icon — компонент на роль: `tag` у Icon — корень, а не роль. */
const ARROW_DOWN = roleIcon('arrowDown')

/**
 * Табы разметкой — у превью Tabs и DragAndDrop, как `tabsSlots` у Vue. Первый
 * таб активен сразу — иначе ни одна панель не смонтируется.
 */
const tabsItems = () =>
	ITEMS.map((item, index) => <Tabs.Item key={item.value} active={index === 0} {...item} />)

/** Панели табов — слотом `content`, вне списка табов; у превью Tabs и DragAndDrop. */
const tabsPanels = () =>
	ITEMS.map((item) => (
		<Tabs.Content key={`c-${item.value}`} value={item.value}>
			<div style={{ padding: 12 }}>Панель «{item.text}»</div>
		</Tabs.Content>
	))

/** Секции разметкой, с содержимым, — у превью Accordion и DragAndDrop. */
const accordionItems = () =>
	ITEMS.map((item) => (
		<Accordion.Item key={item.value} {...item}>
			<div style={{ padding: '4px 0' }}>Содержимое «{item.text}»</div>
		</Accordion.Item>
	))

/** Scope слота `trigger` у Popover — из объявления слота в дескрипторе. */
type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Scope слота `trigger` у Tooltip — ссылка триггера на панель. */
type TTooltipTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

/** Scope слота `trigger` у Menu — связка кнопки с меню и вид «нажата». */
type TMenuTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/**
 * Пункты меню разметкой, как у Vue: группа флажков с подписью, группа
 * переключателей — отмечен один, — действия с подсказками сочетаний, подменю
 * с подменю внутри, пункт с панелью, которая монтируется с первым открытием,
 * выключенное действие и «опасный» пункт своего варианта. Календаря в React
 * нет, и в панели «Срок» — поле числа дней, как у Solid.
 */
const menuItems = () => (
	<>
		<Menu.Group label="Вид">
			<Menu.CheckboxItem value="grid" text="Сетка" selected />
			<Menu.CheckboxItem value="ruler" text="Линейка" />
		</Menu.Group>
		<Menu.Separator />
		<Menu.RadioGroup label="Сортировка" value="name">
			<Menu.RadioItem value="name" text="По имени" />
			<Menu.RadioItem value="date" text="По дате" />
		</Menu.RadioGroup>
		<Menu.Separator />
		<Menu.Item value="edit" text="Изменить" trailing="Ctrl+E" />
		<Menu.Item value="copy" text="Дублировать" trailing="Ctrl+D" />
		<Menu.Submenu value="share" text="Поделиться">
			<Menu.Item value="link" text="Ссылка" />
			<Menu.Item value="mail" text="Почта" />
			<Menu.Submenu value="messengers" text="Мессенджеры">
				<Menu.Item value="telegram" text="Telegram" />
				<Menu.Item value="whatsapp" text="WhatsApp" />
			</Menu.Submenu>
		</Menu.Submenu>
		<Menu.PopoverItem value="due" text="Срок" lazyMount>
			<Field label="Через, дней">
				<NumberInput value={3} min={0} />
			</Field>
		</Menu.PopoverItem>
		<Menu.Item value="archive" text="В архив" disabled />
		<Menu.Separator />
		<Menu.Item value="remove" text="Удалить" variant="negative" trailing="Del" />
	</>
)

/**
 * Открытость окна и выезжающей панели на стенде — своё состояние превью, как
 * `v-model:visible` у Vue (`DialogPreview` в `hosts/vue/previews.ts`): кнопка
 * открывает, крестик, Escape и подложка закрывают через `onChangeVisible`, а
 * строка `visible` задаёт её снаружи — сменилась строка, открытость за ней. С
 * экземпляром ядра (вторая колонка) путь тот же: запись в `visible` инстанса
 * доходит сюда `onChangeVisible`. Колбэк журнала страницы (`onChangeVisible`
 * из пропсов) зовётся вместе со своим, а не затирается им.
 */
function useShown(bind: Readonly<Record<string, unknown>>) {
	const visible = bind.visible === true
	const [shown, setShown] = useState(visible)
	const [given, setGiven] = useState(visible)

	if (given !== visible) {
		setGiven(visible)
		setShown(visible)
	}

	const journal = bind.onChangeVisible

	return {
		shown,
		setShown,
		onChangeVisible: (value: boolean) => {
			setShown(value)

			if (typeof journal === 'function') journal(value)
		},
	}
}

/**
 * Окно на стенде открывает кнопка: закрытое оно спрятано, а открытое
 * накрывает страницу подложкой, и показывать его сразу было бы нечестно по
 * отношению к остальной странице.
 */
function DialogPreview(bind: Readonly<Record<string, unknown>>): ReactNode {
	const { shown, setShown, onChangeVisible } = useShown(bind)

	return (
		<>
			<Button text="Открыть окно" onClick={() => setShown(true)} />
			<Dialog
				{...bind}
				visible={shown}
				onChangeVisible={onChangeVisible}
				title="Настройки"
				footer={
					<>
						<Button text="Отмена" onClick={() => setShown(false)} />
						<Button text="Сохранить" onClick={() => setShown(false)} />
					</>
				}
			>
				<p style={{ margin: '0 0 8px' }}>Произвольное содержимое: текст, поля, кнопки</p>
				<Input placeholder="Имя" />
			</Dialog>
		</>
	)
}

/**
 * Выезжающую панель на стенде тоже открывает кнопка — по той же причине, что
 * окно, и на том же своём состоянии (`useShown`).
 *
 * Кнопка и панель лежат в своей коробке с `position: relative`: с
 * `contained` панель не телепортируется, а встаёт в ближайшем
 * позиционированном предке, и строка `contained` показывает её в коробке
 * превью, а не у края всей страницы.
 */
function DrawerPreview(bind: Readonly<Record<string, unknown>>): ReactNode {
	const { shown, setShown, onChangeVisible } = useShown(bind)

	return (
		<div style={{ position: 'relative', width: '100%', minHeight: 240, overflow: 'hidden' }}>
			<Button text="Открыть панель" onClick={() => setShown(true)} />
			<Drawer
				{...bind}
				visible={shown}
				onChangeVisible={onChangeVisible}
				title="Фильтры"
				footer={
					<>
						<Button text="Сбросить" onClick={() => setShown(false)} />
						<Button text="Применить" onClick={() => setShown(false)} />
					</>
				}
			>
				<p style={{ margin: '0 0 8px' }}>Произвольное содержимое: текст, поля, кнопки</p>
				<Input placeholder="Поиск" />
			</Drawer>
		</div>
	)
}

/** Своё содержимое тоста — кнопка «Отменить»: тост приходит ей пропом и закрывается ею. */
const ToastUndo: TToastRender = ({ toast }) => (
	<Button text="Отменить" onClick={() => toast.close()} />
)

/**
 * Тосты приходят из кода, а не из разметки: кнопки внутри менеджера берут API
 * (`useToasts()`) и показывают тост. Что сообщает тост, — образцы стенда, одни
 * на все хосты (`toastSample`), своё содержимое к ним — кнопка «Отменить»
 * этого хоста. Текст начинается с номера: в стопке видно, какой тост где.
 * Номер — своё состояние превью (`useRef`): это код стенда, а не компонент
 * библиотеки, и перерисовки он не требует.
 *
 * Кнопка — на обычное сообщение и на каждый вид (`TOASTS_ITEM_TYPES`): тост
 * показывает значок своего вида. Последняя — ожидание: «Сохраняем…» с кольцом
 * на месте значка сам не закрывается, а через пару секунд тот же тост сообщает
 * успех. Ряд кнопок — с переносом: в ячейку витрины шесть кнопок одной
 * строкой не встают.
 */
function ToastsTrigger(): ReactNode {
	const { show } = useToasts()
	const count = useRef(0)

	const notify = (type?: TToastsItemType) => {
		const sample = toastSample(type, ToastUndo)

		count.current += 1
		show({ ...sample, text: `${count.current}. ${sample.text}`, type })
	}

	// Работа идёт — тост ждёт; кончилась — тот же тост сообщает итог
	const save = () => {
		count.current += 1

		const toast = show({ text: `${count.current}. Сохраняем…`, loading: true })
		const done = `${count.current}. Сохранено`

		setTimeout(() => {
			if (!toast) return

			toast.loading = false
			toast.type = 'success'
			toast.text = done
		}, TOAST_SAVING)
	}

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
			<Button text="обычное" onClick={() => notify()} />
			{TOASTS_ITEM_TYPES.map((type) => (
				<Button key={type} text={type} onClick={() => notify(type)} />
			))}
			<Button text="загрузка → готово" onClick={save} />
		</div>
	)
}

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не слот: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: (bind) => <Button {...bind} />,

	input: (bind) => <Input {...bind} />,
	'number-input': (bind) => <NumberInput {...bind} />,

	textarea: (bind) => <Textarea {...bind} />,

	// Текста у чекбокса и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': (bind) => (
		<Label text="Согласен">
			<CheckBox {...bind} />
		</Label>
	),

	switch: (bind) => (
		<Label text="Включено">
			<Switch {...bind} />
		</Label>
	),

	// Подпись — проп `text` из пропсов превью, контрол — слотом. Строки
	// страницы правят саму подпись: сторону, размер текста, вариант
	label: (bind) => (
		<Label {...bind}>
			<CheckBox />
		</Label>
	),

	// Поле формы вокруг Input: тексты частей — пропсы превью, контрол —
	// содержимым. Строки страницы правят само поле: сторону подписи, тексты,
	// ошибку
	field: (bind) => (
		<Field {...bind}>
			<Input placeholder="name@example.com" />
		</Field>
	),

	// Имени у ползунка нет, как у чекбокса: видимое даёт подпись Label, над
	// ползунком. Горизонтальный тянется на её ширину, вертикальный — своей высоты
	slider: (bind) => (
		<Label text="Громкость" position="top">
			<Slider {...bind} />
		</Label>
	),

	// Имени у оценки нет, как у ползунка: видимое даёт подпись Label над звёздами
	rating: (bind) => (
		<Label text="Оценка" position="top">
			<Rating {...bind} />
		</Label>
	),

	// Подпись — содержимым: текста у радио нет, оно голый контрол, как CheckBox
	'radio-group': (bind) => (
		<RadioGroup {...bind}>
			{ITEMS.map((item) => (
				<RadioGroup.Item key={item.value} value={item.value}>
					{item.text}
				</RadioGroup.Item>
			))}
		</RadioGroup>
	),

	// Элементы — разметкой, а пришли данными (`items` блока групп страницы) —
	// из них: разметка заменила бы данные, а группы список рисует из данных
	'list-box': (bind) => (
		<ListBox {...bind}>
			{bind.items ? null : ITEMS.map((item) => <ListBox.Item key={item.value} {...item} />)}
		</ListBox>
	),

	// Содержимого у пагинации нет: страницы окна кладёт в коллекцию она сама.
	// Язык номеров и имён стрелок — из шапки стенда
	pagination: (bind) => <Pagination {...bind} />,

	// Содержимое ленты — просто разметка: коллекции у неё нет. Каждый элемент —
	// прямой ребёнок вьюпорта: по ним тема ставит точки снапа, а плагин считает
	// края. Обёртка — граница ширины, как у Vue: сцена ячейки — флексбокс, и
	// лента по ширине содержимого вылезла бы за колонку — листать стало бы
	// нечего
	scroller: (bind) => (
		<div style={{ width: '100%' }}>
			<Scroller {...bind}>
				{ITEMS.map((item) => (
					<span key={item.value} style={{ padding: '4px 12px', whiteSpace: 'nowrap' }}>
						{item.text} пункт ленты
					</span>
				))}
			</Scroller>
		</div>
	),

	// Триггер — Button, связку с панелью и вид «нажат» он берёт из scope
	// слота. В содержимом есть кнопка: на неё при открытии уходит фокус
	popover: (bind) => (
		<Popover
			{...bind}
			trigger={({ triggerAria, triggerDataset }: TPopoverTriggerScope) => (
				<Button text="Открыть" {...triggerAria} {...triggerDataset} />
			)}
		>
			<p style={{ margin: '0 0 8px' }}>Произвольное содержимое: текст, поля, кнопки</p>
			<Button text="Действие" />
		</Popover>
	),

	// Триггер — Button, связку с меню и вид «нажата» он берёт из scope слота,
	// как у Popover. У контекстного меню (`openOn: 'contextmenu'`) в слоте
	// область, как «файл» у потребителя: меню вызывают над ней правой кнопкой,
	// долгим касанием и Shift+F10 — она фокусируемая, — и панель встаёт у точки
	// вызова. Режим область берёт из пропсов колонки, как у Vue: у колонки
	// экземпляра его нет, и там меню вызывают над кнопкой. Пункты — разметкой,
	// а пришли данными (`items` блока групп страницы) — из них, как у списка:
	// разметка заменила бы данные, а группы меню рисует из данных
	menu: (bind) => (
		<Menu
			{...bind}
			trigger={({ triggerAria, triggerDataset }: TMenuTriggerScope) =>
				bind.openOn === 'contextmenu' ? (
					<div
						tabIndex={0}
						style={{ padding: '24px 32px', border: '1px dashed', borderRadius: 8 }}
					>
						Правая кнопка, долгое касание или Shift+F10
					</div>
				) : (
					<Button text="Действия" {...triggerAria} {...triggerDataset} />
				)
			}
		>
			{bind.items ? null : menuItems()}
		</Menu>
	),

	// Триггер — Button, ссылку на панель (`aria-describedby`) он берёт из
	// scope слота. Текст подсказки — содержимым: пропа текста у неё нет
	tooltip: (bind) => (
		<Tooltip
			{...bind}
			trigger={({ triggerAria }: TTooltipTriggerScope) => (
				<Button text="Наведи" {...triggerAria} />
			)}
		>
			Короткое пояснение к кнопке
		</Tooltip>
	),

	// Кнопка открывает окно, окно — на своём состоянии (см. `DialogPreview`)
	dialog: (bind) => <DialogPreview {...bind} />,

	// Кнопка открывает панель, панель — на своём состоянии (см. `DrawerPreview`)
	drawer: (bind) => <DrawerPreview {...bind} />,

	// Менеджер оборачивает кнопки, которые показывают тосты (см.
	// `ToastsTrigger`). Регион с тостами — телепортом у края окна, вне ячейки
	// превью
	toasts: (bind) => (
		<Toasts {...bind}>
			<ToastsTrigger />
		</Toasts>
	),

	// Строки и колонки — данными, как у Vue: частей разметкой у таблицы нет.
	// Обёртка — граница ширины, а с закреплённой шапкой — ещё и окно прокрутки
	// высотой 320 px на сорок строк. Окно таблицы — на странице Virtual
	table: (bind) => (
		<div
			style={
				bind.stickyHead
					? { width: '100%', height: 320, overflow: 'auto' }
					: { width: '100%' }
			}
		>
			<Table
				items={bind.stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS}
				columns={TABLE_COLUMNS}
				{...bind}
			/>
		</div>
	),

	tabs: (bind) => (
		<Tabs {...bind} content={tabsPanels()}>
			{tabsItems()}
		</Tabs>
	),

	accordion: (bind) => <Accordion {...bind}>{accordionItems()}</Accordion>,

	icon: (bind) => <Icon tag={ARROW_DOWN} {...bind} />,

	// Длину горизонтальной полосе даёт контейнер, своей у неё нет. Обёртка —
	// граница ширины, как у Vue: сцена ячейки — флексбокс, и полоса держала бы
	// там только свой минимум. По умолчанию полоса пуста: доля — ноль, а бег —
	// флаг `indeterminate`
	'progress-linear': (bind) => (
		<div style={{ width: '100%' }}>
			<ProgressLinear {...bind} />
		</div>
	),

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`
	'progress-spinner': (bind) => <ProgressSpinner {...bind} />,

	skeleton: (bind) => <Skeleton {...bind} />,

	// Перестановка у трёх коллекций сразу, на одном составе: Tabs и Accordion —
	// той же разметкой, что на их страницах, ListBox — данными, как у Vue.
	// Элемент переставляется в своей коллекции: между коллекциями обёртка не
	// переносит. Ряд — граница ширины, как у окна: табы — во всю ширину ряда,
	// список и секции — под ними, рядом
	'drag-and-drop': (bind) => (
		<DragAndDrop {...bind}>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: 24,
					alignItems: 'flex-start',
					width: '100%',
				}}
			>
				<div style={{ flex: '1 1 100%', minWidth: 0 }}>
					<Tabs content={tabsPanels()}>{tabsItems()}</Tabs>
				</div>
				<ListBox items={ITEMS} aria_label="Пункты" />
				<div style={{ flex: 1, minWidth: 200 }}>
					<Accordion>{accordionItems()}</Accordion>
				</div>
			</div>
		</DragAndDrop>
	),

	// Окно на списке и таблице по тысяче элементов: на пяти его не видно.
	// ListBox с пределом строк прокручивается сам, таблица — в обёртке высотой
	// 320 px; строка `enabled` включает и выключает окно у обоих. Элементы —
	// данными (`items`): элементы разметкой окно не прячет. Ряд — граница
	// ширины, как у Vue. Select в React нет, и его окна рядом тоже.
	// Переставленную колонку таблица ведёт целиком, с ячейками строк
	// (`reorderPreview: 'column'`): в окне это сотни ячеек, а не тысячи
	virtual: (bind) => (
		<Virtual {...bind}>
			<div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', width: '100%' }}>
				<ListBox items={COLLECTION_MANY_ITEMS} maxRows={8} aria_label="Пункты" />
				<div style={{ flex: 1, minWidth: 0, height: 320, overflow: 'auto' }}>
					<Table
						items={TABLE_MANY_ROWS}
						columns={TABLE_COLUMNS}
						reorderPreview="column"
						aria_label="Сотрудники"
					/>
				</div>
			</div>
		</Virtual>
	),
}
