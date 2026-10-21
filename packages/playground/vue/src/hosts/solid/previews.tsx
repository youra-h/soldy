import { For, Show, type Accessor, type JSX } from 'solid-js'
import {
	COLLECTION_ITEMS,
	COLLECTION_MANY_ITEMS,
	TABLE_COLUMNS,
	TABLE_MANY_ROWS,
	TABLE_ROWS,
	TABLE_SCROLL_ROWS,
} from '@soldy-ui/playground-shared'
import type {
	DescriptorSlots,
	MenuDescriptor,
	PopoverDescriptor,
	TooltipDescriptor,
} from '@soldy-ui/setup'
import {
	Accordion,
	Button,
	CheckBox,
	DragAndDrop,
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
	Tooltip,
	Virtual,
	roleIcon,
} from '@soldy-ui/solid'

/** Пропсы превью: пропы строки, `ctrl` с экземпляром ядра и колбэки событий хоста. */
export type TPreviewProps = Record<string, unknown>

/**
 * Как рисовать компонент на стенде — в Solid.
 *
 * Та же карта, что у хостов Vue, React и Svelte, и с теми же ключами —
 * идентификаторами реестра: содержимое не свойство, из метаданных его не
 * достать, а разметка у каждого фреймворка своя. Превью то же самое, что у
 * Vue, чтобы колонки фреймворков можно было сравнивать глазами.
 *
 * Функция получает пропсы сигналом (`bind`) и раскладывает их вызовом —
 * `{...bind()}`: так Solid отдаёт компоненту сам аксессор (`mergeProps`), и
 * компонент перечитывает пропсы на каждую их смену. Тело компонента Solid
 * выполняется один раз, и разложенный готовый объект пропсов остался бы
 * первым навсегда. В первой колонке там пропы, во второй — `ctrl` с
 * экземпляром ядра, у обеих — колбэки событий, которые кладёт хост. Значения
 * пропов самого компонента — подпись кнопки, плейсхолдер поля — данные, одни
 * на все хосты (`PREVIEW_PROPS` в общем пакете), и в `bind` их кладёт
 * оболочка. Здесь — обёртка и содержимое.
 *
 * Слоёв и `frame` здесь нет: во Vue это ComponentView с чужими пропами, а в
 * Solid чужой проп ушёл бы атрибутом в корень.
 */
export type TPreview = (bind: Accessor<TPreviewProps>) => JSX.Element

/** Scope слота триггера Popover — связка с панелью и вид «нажат». */
type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Scope слота триггера Tooltip — ссылка на панель. */
type TTooltipTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

/** Scope слота триггера Menu — связка кнопки с меню и вид «нажата». */
type TMenuTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/** Содержимое коллекций — из общего манифеста, как у Vue, React и Svelte. */
const ITEMS = COLLECTION_ITEMS

/** Глиф превью Icon — компонент на роль: `tag` у Icon — корень, а не роль. */
const ARROW_DOWN = roleIcon('arrowDown')

/**
 * Табы разметкой — у превью Tabs и DragAndDrop, как и панели и секции ниже.
 * Первый таб активен сразу — иначе ни одна панель не смонтируется. Зовёт эти
 * функции выражение в разметке владельца: Solid разворачивает его там, где
 * владелец развернул слот, — внутри слоя его лифта, — а не в теле превью.
 */
const tabsItems = () => (
	<For each={ITEMS}>{(item, index) => <Tabs.Item active={index() === 0} {...item} />}</For>
)

/** Панели табов — слотом `content`, вне списка табов. */
const tabsPanels = () => (
	<For each={ITEMS}>
		{(item) => (
			<Tabs.Content value={item.value}>
				<div style={{ padding: '12px' }}>Панель «{item.text}»</div>
			</Tabs.Content>
		)}
	</For>
)

/** Секции разметкой, с содержимым. */
const accordionItems = () => (
	<For each={ITEMS}>
		{(item) => (
			<Accordion.Item {...item}>
				<div style={{ padding: '4px 0' }}>Содержимое «{item.text}»</div>
			</Accordion.Item>
		)}
	</For>
)

/**
 * Пункты меню разметкой, как у Vue: группа флажков с подписью, группа
 * переключателей — отмечен один, — действия с подсказками сочетаний, подменю
 * с подменю внутри, пункт с панелью, которая монтируется с первым открытием,
 * выключенное действие и «опасный» пункт своего варианта. Календаря в Solid
 * нет, и в панели «Срок» — поле числа дней.
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

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не слот: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: (bind) => <Button {...bind()} />,

	input: (bind) => <Input {...bind()} />,
	'number-input': (bind) => <NumberInput {...bind()} />,

	textarea: (bind) => <Textarea {...bind()} />,

	// Текста у чекбокса и переключателя нет, оба — голый контрол: подпись даёт
	// обёртка Label. Её пропы задаёт превью, строки страницы правят контрол
	'check-box': (bind) => (
		<Label text="Согласен">
			<CheckBox {...bind()} />
		</Label>
	),

	switch: (bind) => (
		<Label text="Включено">
			<Switch {...bind()} />
		</Label>
	),

	// Подпись — проп `text` из пропсов превью, контрол — слотом. Строки
	// страницы правят саму подпись: сторону, размер текста, вариант
	label: (bind) => (
		<Label {...bind()}>
			<CheckBox />
		</Label>
	),

	// Поле формы вокруг Input: тексты частей — пропсы превью, контрол —
	// содержимым. Строки страницы правят само поле: сторону подписи, тексты,
	// ошибку
	field: (bind) => (
		<Field {...bind()}>
			<Input placeholder="name@example.com" />
		</Field>
	),

	// Имени у ползунка нет, как у чекбокса: видимое даёт подпись Label, над
	// ползунком. Горизонтальный тянется на её ширину, вертикальный — своей высоты
	slider: (bind) => (
		<Label text="Громкость" position="top">
			<Slider {...bind()} />
		</Label>
	),

	// Имени у оценки нет, как у ползунка: видимое даёт подпись Label над звёздами
	rating: (bind) => (
		<Label text="Оценка" position="top">
			<Rating {...bind()} />
		</Label>
	),

	// Подпись — содержимым: текста у радио нет, оно голый контрол, как CheckBox
	'radio-group': (bind) => (
		<RadioGroup {...bind()}>
			<For each={ITEMS}>
				{(item) => <RadioGroup.Item value={item.value}>{item.text}</RadioGroup.Item>}
			</For>
		</RadioGroup>
	),

	// Элементы — разметкой, а пришли данными (`items` блока групп страницы) —
	// из них: разметка заменила бы данные, а группы список рисует из данных
	'list-box': (bind) => (
		<ListBox {...bind()}>
			{bind().items ? undefined : (
				<For each={ITEMS}>{(item) => <ListBox.Item {...item} />}</For>
			)}
		</ListBox>
	),

	// Содержимого у пагинации нет: страницы окна кладёт в коллекцию она сама.
	// Язык номеров и имён стрелок — из шапки стенда
	pagination: (bind) => <Pagination {...bind()} />,

	// Триггер — Button, связку с панелью и вид «нажат» он берёт из scope
	// слота и читает его в разметке: связка меняется на открытии, а триггер
	// остаётся тем же узлом, с фокусом на нём. В содержимом есть кнопка: на неё
	// при открытии уходит фокус
	popover: (bind) => (
		<Popover
			{...bind()}
			trigger={(scope: TPopoverTriggerScope) => (
				<Button text="Открыть" {...scope.triggerAria} {...scope.triggerDataset} />
			)}
		>
			<p style={{ margin: '0 0 8px' }}>Произвольное содержимое: текст, поля, кнопки</p>
			<Button text="Действие" />
		</Popover>
	),

	// Триггер — Button, ссылку на панель (`aria-describedby`) он берёт из
	// scope слота, тоже в разметке. Текст подсказки — слотом: пропа текста у
	// неё нет
	tooltip: (bind) => (
		<Tooltip
			{...bind()}
			trigger={(scope: TTooltipTriggerScope) => (
				<Button text="Наведи" {...scope.triggerAria} />
			)}
		>
			Короткое пояснение к кнопке
		</Tooltip>
	),

	// Триггер — Button, связку с меню и вид «нажата» он берёт из scope слота и
	// читает его в разметке, как у Popover. У контекстного меню (`openOn:
	// 'contextmenu'`) в слоте область, как «файл» у потребителя: меню вызывают
	// над ней правой кнопкой, долгим касанием и Shift+F10 — она фокусируемая, —
	// и панель встаёт у точки вызова. Режим область берёт из пропсов колонки,
	// как у Vue: у колонки экземпляра его нет, и там меню вызывают над кнопкой.
	// Выбирает `Show` в разметке слота, а не условие в теле его функции: тело
	// читало бы пропсы при вызове, и смена любой строки рисовала бы триггер
	// заново. Пункты — разметкой, а пришли данными (`items` блока групп
	// страницы) — из них, как у списка: разметка заменила бы данные, а группы
	// меню рисует из данных
	menu: (bind) => (
		<Menu
			{...bind()}
			trigger={(scope: TMenuTriggerScope) => (
				<Show
					when={bind().openOn === 'contextmenu'}
					fallback={
						<Button text="Действия" {...scope.triggerAria} {...scope.triggerDataset} />
					}
				>
					<div
						tabindex="0"
						style={{
							padding: '24px 32px',
							border: '1px dashed',
							'border-radius': '8px',
						}}
					>
						Правая кнопка, долгое касание или Shift+F10
					</div>
				</Show>
			)}
		>
			{bind().items ? undefined : menuItems()}
		</Menu>
	),

	// Содержимое ленты — просто разметка: каждый элемент — прямой ребёнок
	// вьюпорта, по ним тема ставит точки снапа, а плагин считает края. Обёртка —
	// граница ширины: сцена ячейки — флексбокс, и лента шириной по содержимому
	// вылезла бы за колонку целиком — листать стало бы нечего
	scroller: (bind) => (
		<div style={{ width: '100%' }}>
			<Scroller {...bind()}>
				<For each={ITEMS}>
					{(item) => (
						<span style={{ padding: '4px 12px', 'white-space': 'nowrap' }}>
							{item.text} пункт ленты
						</span>
					)}
				</For>
			</Scroller>
		</div>
	),

	// Строки и колонки — данными, как у Vue и React: частей разметкой у таблицы
	// нет. Обёртка — граница ширины, а с закреплённой шапкой — ещё и окно
	// прокрутки высотой 320 px на сорок строк. Окно таблицы — на странице
	// Virtual. Стиль — объектом с именами CSS: так его ставит Solid
	table: (bind) => (
		<div
			style={
				bind().stickyHead
					? { width: '100%', height: '320px', overflow: 'auto' }
					: { width: '100%' }
			}
		>
			<Table
				items={bind().stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS}
				columns={TABLE_COLUMNS}
				{...bind()}
			/>
		</div>
	),

	tabs: (bind) => (
		<Tabs {...bind()} content={tabsPanels()}>
			{tabsItems()}
		</Tabs>
	),

	accordion: (bind) => <Accordion {...bind()}>{accordionItems()}</Accordion>,

	icon: (bind) => <Icon tag={ARROW_DOWN} {...bind()} />,

	// Длину горизонтальной полосе даёт контейнер, своей у неё нет. Обёртка —
	// граница ширины, как у ленты; вертикальная — строчный блок своей высоты, и
	// обёртка ей не мешает. По умолчанию полоса пуста: доля — ноль, а бег — флаг
	// `indeterminate`
	'progress-linear': (bind) => (
		<div style={{ width: '100%' }}>
			<ProgressLinear {...bind()} />
		</div>
	),

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`
	'progress-spinner': (bind) => <ProgressSpinner {...bind()} />,

	skeleton: (bind) => <Skeleton {...bind()} />,

	// Перестановка у трёх коллекций сразу, на одном составе: Tabs и Accordion —
	// той же разметкой, что на их страницах, ListBox — данными, как у Vue и
	// React. Элемент переставляется в своей коллекции: между коллекциями
	// обёртка не переносит. Ряд — граница ширины, как у окна: табы — во всю
	// ширину ряда, список и секции — под ними, рядом
	'drag-and-drop': (bind) => (
		<DragAndDrop {...bind()}>
			<div
				style={{
					display: 'flex',
					'flex-wrap': 'wrap',
					gap: '24px',
					'align-items': 'flex-start',
					width: '100%',
				}}
			>
				<div style={{ flex: '1 1 100%', 'min-width': '0' }}>
					<Tabs content={tabsPanels()}>{tabsItems()}</Tabs>
				</div>
				<ListBox items={ITEMS} aria_label="Пункты" />
				<div style={{ flex: '1', 'min-width': '200px' }}>
					<Accordion>{accordionItems()}</Accordion>
				</div>
			</div>
		</DragAndDrop>
	),

	// Окно на списке и таблице по тысяче элементов: на пяти его не видно.
	// ListBox с пределом строк прокручивается сам, таблица — в обёртке высотой
	// 320 px; строка `enabled` включает и выключает окно у обоих. Элементы —
	// данными (`items`): элементы разметкой окно не прячет. Ряд — граница
	// ширины, как у Vue и React. Select в Solid нет, и его окна рядом тоже.
	// Переставленную колонку таблица ведёт целиком, с ячейками строк
	// (`reorderPreview: 'column'`): в окне это сотни ячеек, а не тысячи
	virtual: (bind) => (
		<Virtual {...bind()}>
			<div
				style={{ display: 'flex', gap: '24px', 'align-items': 'flex-start', width: '100%' }}
			>
				<ListBox items={COLLECTION_MANY_ITEMS} maxRows={8} aria_label="Пункты" />
				<div style={{ flex: '1', 'min-width': '0', height: '320px', overflow: 'auto' }}>
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
