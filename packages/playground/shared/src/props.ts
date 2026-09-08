import type { IPropDeclaration } from '@soldy/accessor'
import {
	ACCORDION_VIEWS,
	COMPONENT_SIZES,
	BUTTON_VIEWS,
	COMPONENT_VARIANTS,
	DIRECTIONS,
	FRAME_POSITIONS,
	HTML_TAGS,
	LIST_BOX_VIEWS,
	SCROLL_BEHAVIORS,
	SKELETON_ANIMATIONS,
	SKELETON_SHAPES,
	TABS_ALIGNMENTS,
	TABS_ORIENTATIONS,
	TABS_POSITIONS,
	TABS_VIEWS,
} from './enums'
import type { TControlKind, TPropControl } from './types'

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
 * `InputControl` — расписывать `size` в двадцати компонентах значило бы
 * получить двадцать слегка разных формулировок.
 */
const SHARED: Record<string, string> = {
	rendered: 'Есть ли компонент в дереве. Аналог v-if: false — узла нет вовсе',
	visible: 'Виден ли компонент. В отличие от rendered узел остаётся в дереве',
	tag: 'Тег корневого элемента. Меняет разметку, не меняя поведения',
	direction: 'Направление письма. inherit — атрибут dir не ставится вовсе',
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
		indeterminate: 'Третье состояние: выбрано частично. Ставится извне, кликом не снимается',
		plain: 'Без рамки и фона — для плотных списков',
	},
	select: {
		open: 'Раскрыта ли панель со списком',
		placeholder: 'Что показывать, пока ничего не выбрано',
		closeOnSelect: 'Закрывать панель после выбора. Для множественного выбора обычно false',
		clearable: 'Показывать кнопку очистки значения',
		clearLabel: 'Имя кнопки очистки для скринридера. Собирается с именем поля',
	},
	'list-box': {
		maxRows: 'Сколько строк показывать до появления прокрутки',
		autoWidth: 'Ширина по содержимому вместо фиксированной',
		wordWrap: 'Переносить длинный текст элемента вместо обрезки',
		scrollBehavior: 'Как прокручивать к элементу при навигации с клавиатуры',
		view: 'Оформление списка',
	},
	tabs: {
		orientation: 'Как расположен список вкладок',
		alignment: 'Выравнивание вкладок вдоль списка',
		position: 'С какой стороны от панели стоит список вкладок',
		view: 'Оформление: линия, контейнер или папки',
		closable: 'Показывать ли у вкладок кнопку закрытия',
	},
	accordion: {
		view: 'Оформление секций',
	},
	icon: {
		width: 'Ширина. Пусто — берётся из size',
		height: 'Высота. Пусто — берётся из size',
	},
	spinner: {
		borderWidth: 'Толщина дуги',
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
		width: 'Ширина слоя',
		height: 'Высота слоя',
		position: 'Способ позиционирования: в потоке страницы или относительно окна',
		target: 'Куда телепортировать содержимое',
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
	},
	button: { view: BUTTON_VIEWS },
	accordion: { view: ACCORDION_VIEWS },
	'list-box': { view: LIST_BOX_VIEWS, scrollBehavior: SCROLL_BEHAVIORS },
	tabs: {
		view: TABS_VIEWS,
		orientation: TABS_ORIENTATIONS,
		alignment: TABS_ALIGNMENTS,
		position: TABS_POSITIONS,
	},
	skeleton: { shape: SKELETON_SHAPES, animation: SKELETON_ANIMATIONS },
	frame: { position: FRAME_POSITIONS },
}

/**
 * `ctrl` — не свойство компонента, а способ отдать ему готовый экземпляр ядра.
 * Стенд им и пользуется во второй колонке, поэтому в список редактируемых
 * пропов он не идёт.
 */
export const NON_EDITABLE = new Set(['ctrl', 'plugins'])

export function describeProp(componentId: string, prop: string): string | undefined {
	return OWN[componentId]?.[prop] ?? SHARED[prop]
}

export function optionsForProp(componentId: string, prop: string): readonly string[] | undefined {
	return OPTIONS[componentId]?.[prop] ?? OPTIONS['*'][prop]
}

/**
 * Имя конструктора пропа.
 *
 * В декларации `type` встречается в трёх видах: сам конструктор (`String`),
 * массив конструкторов (`tag: [String, Object]`) и обёртка `{ ctor }` от
 * `defineType`. Разбирать приходится все три — унифицировать это в контракте
 * не стали, потому что каждая форма зачем-то нужна: массив описывает
 * объединение, обёртка носит фантомный тип для TS.
 */
function firstCtorName(type: unknown): string | undefined {
	if (!type) return undefined
	if (Array.isArray(type)) return firstCtorName(type[0])

	if (typeof type === 'object' && 'ctor' in type) {
		return firstCtorName((type as { ctor: unknown }).ctor)
	}

	return (type as { name?: string }).name
}

/**
 * Чем редактировать проп — выводится, а не задаётся руками.
 *
 * Порядок важен: список значений сильнее типа. `view` объявлен как `String`,
 * но редактировать его текстовым полем бессмысленно — вариантов четыре.
 */
export function controlKind(componentId: string, prop: IPropDeclaration): TControlKind {
	if (optionsForProp(componentId, prop.name.name)) return 'select'

	const ctor = firstCtorName(prop.type)

	if (ctor === 'Boolean') return 'switch'
	if (ctor === 'Number') return 'number'

	return 'text'
}

/** Полное описание контрола для одного пропа. */
export function propControl(
	componentId: string,
	prop: IPropDeclaration,
	defaults: Record<string, unknown> = {},
): TPropControl {
	const name = prop.name.name

	return {
		name,
		kind: controlKind(componentId, prop),
		options: optionsForProp(componentId, name),
		description: describeProp(componentId, name) ?? '',
		default: defaults[name],
	}
}
