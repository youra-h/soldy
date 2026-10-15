import { For, type Accessor, type JSX } from 'solid-js'
import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
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
 * экземпляром ядра, у обеих — колбэки событий, которые кладёт хост.
 *
 * Слоёв и `frame` здесь нет: во Vue это ComponentView с чужими пропами, а в
 * Solid чужой проп ушёл бы атрибутом в корень.
 */
export type TPreview = (bind: Accessor<TPreviewProps>) => JSX.Element

/** Содержимое коллекций — из общего манифеста, как у Vue, React и Svelte. */
const ITEMS = COLLECTION_ITEMS

/** Глиф превью Icon — компонент на роль: `tag` у Icon — корень, а не роль. */
const ARROW_DOWN = roleIcon('arrowDown')

export const PREVIEWS: Record<string, TPreview> = {
	// Подпись — пропом `text`, а не слотом: заданный слот перекрывает проп, и
	// строка `text` на странице свойств не меняла бы ничего видимого
	button: (bind) => <Button text="Кнопка" {...bind()} />,

	input: (bind) => <Input placeholder="Введите текст" {...bind()} />,

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

	// Подпись — пропом `text`, контрол — слотом. Строки страницы правят саму
	// подпись: сторону, размер текста, вариант
	label: (bind) => (
		<Label text="Согласен" {...bind()}>
			<CheckBox />
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

	'list-box': (bind) => (
		<ListBox {...bind()}>
			<For each={ITEMS}>{(item) => <ListBox.Item {...item} />}</For>
		</ListBox>
	),

	// Первый таб активен сразу — иначе ни одна панель не смонтируется. Панели —
	// слотом `content`, вне списка табов
	tabs: (bind) => (
		<Tabs
			{...bind()}
			content={
				<For each={ITEMS}>
					{(item) => (
						<Tabs.Content value={item.value}>
							<div style={{ padding: '12px' }}>Панель «{item.text}»</div>
						</Tabs.Content>
					)}
				</For>
			}
		>
			<For each={ITEMS}>
				{(item, index) => <Tabs.Item active={index() === 0} {...item} />}
			</For>
		</Tabs>
	),

	accordion: (bind) => (
		<Accordion {...bind()}>
			<For each={ITEMS}>
				{(item) => (
					<Accordion.Item {...item}>
						<div style={{ padding: '4px 0' }}>Содержимое «{item.text}»</div>
					</Accordion.Item>
				)}
			</For>
		</Accordion>
	),

	icon: (bind) => <Icon tag={ARROW_DOWN} {...bind()} />,

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`. Имени без видимой подписи у него нет, превью
	// даёт его пропом
	'progress-spinner': (bind) => <ProgressSpinner aria_label="Загрузка" {...bind()} />,

	skeleton: (bind) => <Skeleton width={160} height={16} {...bind()} />,
}
