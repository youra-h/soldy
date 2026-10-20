import { For, type Accessor, type JSX } from 'solid-js'
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
	ProgressSpinner,
	RadioGroup,
	Skeleton,
	Switch,
	Table,
	Tabs,
	Textarea,
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

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не слот: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: (bind) => <Button {...bind()} />,

	input: (bind) => <Input {...bind()} />,

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

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`
	'progress-spinner': (bind) => <ProgressSpinner {...bind()} />,

	skeleton: (bind) => <Skeleton {...bind()} />,

	// Перестановка у трёх коллекций сразу, на одном составе: Tabs и Accordion —
	// той же разметкой, что на их страницах, ListBox — данными, как у Vue и
	// React. Элемент переставляется в своей коллекции: между коллекциями
	// обёртка не переносит. Ряд — граница ширины, как у окна: табы — во всю
	// ширину ряда, список и секции — под ними, рядом. Состав списку — копией: в
	// манифесте он только для чтения, а `items` у списка — массив
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
				<ListBox items={[...ITEMS]} aria_label="Пункты" />
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
