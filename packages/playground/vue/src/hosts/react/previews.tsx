import type { ReactNode } from 'react'
import { COLLECTION_ITEMS, COLLECTION_MANY_ITEMS } from '@soldy-ui/playground-shared'
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
 * колбэки событий, которые кладёт хост.
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
	// Подпись — пропом `text`, а не слотом: заданный слот перекрывает проп, и
	// строка `text` на странице свойств не меняла бы ничего видимого
	button: (bind) => <Button text="Кнопка" {...bind} />,

	input: (bind) => <Input placeholder="Введите текст" {...bind} />,

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

	// Подпись — пропом `text`, контрол — слотом. Строки страницы правят саму
	// подпись: сторону, размер текста, вариант
	label: (bind) => (
		<Label text="Согласен" {...bind}>
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
	// бег — флаг `indeterminate`. Имени без видимой подписи у него нет, превью
	// даёт его пропом
	'progress-spinner': (bind) => <ProgressSpinner aria_label="Загрузка" {...bind} />,

	skeleton: (bind) => <Skeleton width={160} height={16} {...bind} />,

	// Окно на списке в тысячу элементов: на пяти его не видно. ListBox с
	// пределом строк прокручивается сам, строка `enabled` включает и выключает
	// окно. Элементы — данными (`items`): элементы разметкой окно не прячет.
	// Таблицы в React нет, и окна таблицы рядом, как у Vue, тоже
	virtual: (bind) => (
		<Virtual {...bind}>
			<ListBox items={COLLECTION_MANY_ITEMS} maxRows={8} aria_label="Пункты" />
		</Virtual>
	),
}
