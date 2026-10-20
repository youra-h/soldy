import type { ReactNode } from 'react'
import {
	COLLECTION_ITEMS,
	COLLECTION_MANY_ITEMS,
	TABLE_COLUMNS,
	TABLE_MANY_ROWS,
	TABLE_ROWS,
	TABLE_SCROLL_ROWS,
} from '@soldy-ui/playground-shared'
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
	Pagination,
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
	Virtual,
	roleIcon,
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

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не слот: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: (bind) => <Button {...bind} />,

	input: (bind) => <Input {...bind} />,

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
