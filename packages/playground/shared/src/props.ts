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
	LIST_CONTENT_FITS,
	LIST_INDICATORS,
	SCROLL_BEHAVIORS,
	SELECTION_MODES,
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

	// Коллекционный — одинаков у ListBox, Select и Accordion
	mode: 'Режим выбора: ничего, один элемент или несколько',

	// Списочный контракт `IList` — общий у ListBox и Select. Предка у них
	// общего нет, но свойства одни и те же, значит и описание одно
	maxRows: 'Сколько строк показывать до появления прокрутки. 0 — все',
	contentFit:
		'Что делать с не помещающимся текстом: обрезать, перенести или раздвинуть список',
	scrollBehavior: 'Как прокручивать к элементу при навигации с клавиатуры',
	indicator: 'Где показывать отметку выбранного: нигде, в начале или в конце строки',
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
		width: 'Ширина слоя. `auto` — по содержимому',
		height: 'Высота слоя. `auto` — по содержимому',
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
		// Из списочного контракта — имена уникальны, разночтений быть не может
		contentFit: LIST_CONTENT_FITS,
		scrollBehavior: SCROLL_BEHAVIORS,
		indicator: LIST_INDICATORS,
		// Коллекционный: один и тот же режим выбора у всех коллекций
		mode: SELECTION_MODES,
	},
	button: { view: BUTTON_VIEWS },
	accordion: { view: ACCORDION_VIEWS },
	'list-box': { view: LIST_BOX_VIEWS },
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
export const NON_EDITABLE = new Set([
	'ctrl',
	'plugins',
	// Коллекционные: состав элементов задаёт само превью, а `trackBy` —
	// функция. Контрола, которым осмысленно править то и другое, не бывает
	'items',
	'trackBy',
	// Готовая коллекция снаружи — как `ctrl`, объект, а не значение
	'engine',
])

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
	scope: TPropControl['scope'] = 'component',
): TPropControl {
	const name = prop.name.name

	return {
		name,
		scope,
		kind: controlKind(componentId, prop),
		options: optionsForProp(componentId, name),
		description: describeProp(componentId, name) ?? '',
		default: defaults[name],
	}
}
