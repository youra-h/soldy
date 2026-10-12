import type { Accessor, JSX } from 'solid-js'
import {
	Button,
	CheckBox,
	Icon,
	Input,
	Label,
	ProgressSpinner,
	Skeleton,
	Switch,
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

	icon: (bind) => <Icon tag={ARROW_DOWN} {...bind()} />,

	// Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а
	// бег — флаг `indeterminate`. Имени без видимой подписи у него нет, превью
	// даёт его пропом
	'progress-spinner': (bind) => <ProgressSpinner aria_label="Загрузка" {...bind()} />,

	skeleton: (bind) => <Skeleton width={160} height={16} {...bind()} />,
}
