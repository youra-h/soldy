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

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — проп `text` из пропсов превью, а не слот: заданный слот
	// перекрывает проп, и строка `text` не меняла бы ничего видимого
	button: (bind) => <Button {...bind} />,

	input: (bind) => <Input {...bind} />,

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

	'list-box': (bind) => (
		<ListBox {...bind}>
			{ITEMS.map((item) => (
				<ListBox.Item key={item.value} {...item} />
			))}
		</ListBox>
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

	// Первый таб активен сразу — иначе ни одна панель не смонтируется. Панели —
	// слотом `content`, вне списка табов
	tabs: (bind) => (
		<Tabs
			{...bind}
			content={ITEMS.map((item) => (
				<Tabs.Content key={`c-${item.value}`} value={item.value}>
					<div style={{ padding: 12 }}>Панель «{item.text}»</div>
				</Tabs.Content>
			))}
		>
			{ITEMS.map((item, index) => (
				<Tabs.Item key={item.value} active={index === 0} {...item} />
			))}
		</Tabs>
	),

	accordion: (bind) => (
		<Accordion {...bind}>
			{ITEMS.map((item) => (
				<Accordion.Item key={item.value} {...item}>
					<div style={{ padding: '4px 0' }}>Содержимое «{item.text}»</div>
				</Accordion.Item>
			))}
		</Accordion>
	),

	icon: (bind) => <Icon tag={ARROW_DOWN} {...bind} />,

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`
	'progress-spinner': (bind) => <ProgressSpinner {...bind} />,

	skeleton: (bind) => <Skeleton {...bind} />,

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
