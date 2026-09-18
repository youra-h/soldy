import type { IPropDeclaration } from '@soldy/accessor'
import { underscorePropNaming } from '@soldy/setup'
import {
	COMPONENT_SIZES,
	BUTTON_VIEWS,
	CHECK_BOX_VIEWS,
	COMPONENT_VARIANTS,
	DIRECTIONS,
	FRAME_PLACEMENTS,
	FRAME_POSITIONS,
	HTML_TAGS,
	LIST_CONTENT_FITS,
	LIST_INDICATORS,
	SCROLL_BEHAVIORS,
	SELECTION_MODES,
	SELECT_EDITABLE_MODES,
	SELECT_PLACEMENTS,
	SKELETON_ANIMATIONS,
	SKELETON_SHAPES,
	TABS_ALIGNMENTS,
	TABS_ORIENTATIONS,
	TABS_POSITIONS,
	TABS_VIEWS,
} from './enums'
import type {
	TComponentEntry,
	TControlKind,
	TPropControl,
	TPropControlGroups,
	TPropOwner,
} from './types'

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
	contentFit: 'Что делать с не помещающимся текстом: обрезать, перенести или раздвинуть список',
	scrollBehavior: 'Как прокручивать к элементу при навигации с клавиатуры',
	indicator: 'Где показывать отметку выбранного: нигде, в начале или в конце строки',
}

/**
 * Пропы плагинов — по имени с неймспейсом, как их пишут в разметке.
 *
 * Имя с неймспейсом уникально на всю библиотеку, поэтому описание одно:
 * `anchor_placement` значит одно и то же у любого компонента с якорем, а
 * `placement` у Select — другой проп, и описан он у самого Select.
 */
const PLUGIN: Record<string, string> = {
	aria_label:
		'Доступное имя для скринридера. Нужно, когда видимого текста нет: иконка, поле без подписи',
	aria_labelledBy: 'id элемента, чей текст служит именем. Сильнее aria_label',
	aria_describedBy: 'id элемента с пояснением: подсказка под полем, текст ошибки',
	anchor_placement:
		'Сторона и выравнивание панели у якоря. Не влезает по высоте — flip переносит на другую сторону',
	anchor_matchWidth: 'Тянуть ширину панели по ширине якоря',
	anchor_flip:
		'Переносить панель на другую сторону, если на выбранной она не влезает по высоте окна',
	anchor_offset: 'Отступ панели от якоря, px',
	dismiss_enabled:
		'Слушать ли нажатие мимо панели, чтобы её закрыть. У Select его ведёт сам плагин по open',
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
		indeterminate:
			'Третье состояние: выбрано частично. Ставится извне, клик снимает его и отмечает чекбокс',
		view: 'Оформление: plain — без рамки и фона, для плотных списков',
	},
	select: {
		open: 'Раскрыта ли панель со списком',
		placeholder: 'Что показывать, пока ничего не выбрано',
		closeOnSelect: 'Закрывать панель после выбора. Для множественного выбора обычно false',
		clearable: 'Показывать кнопку очистки значения',
		clearLabel: 'Имя кнопки очистки для скринридера. Собирается с именем поля',
		editable: 'Можно ли вводить текст в поле. Выключено — режим select-only',
		editableMode:
			'Что делает ввод текста при editable: ничего, подсветка совпадения или фильтрация',
		removeOnBackspace:
			'Удалять выбранные теги по Backspace в пустом поле. Нужны editable и множественный выбор',
		placement:
			'С какой стороны открывается панель: auto — снизу, у края окна сверху; top и bottom — всегда там',
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
	tags: {
		view: 'Оформление тегов — вид набора, тема применяет его к каждому тегу',
		closable: 'Показывать ли у тегов кнопку закрытия',
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
		// Плагинный — по имени с неймспейсом: оно уникально, и с `placement`
		// у Select общий список не столкнётся
		anchor_placement: FRAME_PLACEMENTS,
	},
	button: { view: BUTTON_VIEWS },
	'check-box': { view: CHECK_BOX_VIEWS },
	accordion: { view: BUTTON_VIEWS },
	'list-box': { view: BUTTON_VIEWS },
	select: { editableMode: SELECT_EDITABLE_MODES, placement: SELECT_PLACEMENTS },
	tabs: {
		view: TABS_VIEWS,
		orientation: TABS_ORIENTATIONS,
		alignment: TABS_ALIGNMENTS,
		position: TABS_POSITIONS,
	},
	tags: { view: BUTTON_VIEWS },
	skeleton: { shape: SKELETON_SHAPES, animation: SKELETON_ANIMATIONS },
	frame: { position: FRAME_POSITIONS },
}

/**
 * Что ещё выставить превью на строке пропа, чтобы сам проп было видно.
 *
 * Строка правит одно свойство, остальные остаются по умолчанию. Большинству
 * пропов этого хватает, но не тем, что раскрываются только в сочетании. Таких
 * случаев два:
 *
 * - без сочетания проп не делает ничего: `removeOnBackspace` без `editable` и
 *   `multiple` — строка показала бы переключатель, который ни на что не
 *   влияет;
 * - проп работает и сам, но зачем он нужен, видно только в сочетании:
 *   `indicator` у ListBox ставит отметку и при одиночном выборе, а смысл у неё
 *   там, где выбрано несколько элементов.
 *
 * Пресет — только для своей строки. Глобальный дефолт превью (как `editable`
 * у Select) перевёл бы в `multiple` и все соседние строки, а `closeOnSelect`
 * в одиночном выборе и во множественном выглядит по-разному.
 */
export const PRESETS: Record<string, Record<string, Record<string, unknown>>> = {
	select: {
		removeOnBackspace: { editable: true, mode: 'multiple' },
	},
	'list-box': {
		indicator: { mode: 'multiple' },
	},
}

export function presetForProp(componentId: string, prop: string): Record<string, unknown> {
	return PRESETS[componentId]?.[prop] ?? {}
}

/**
 * `ctrl` — не свойство компонента, а способ отдать ему готовый экземпляр ядра.
 * Стенд им и пользуется во второй колонке, поэтому в список редактируемых
 * пропов он не идёт.
 *
 * Ключ — имя из разметки, то же, что у описаний: у пропа плагина с неймспейсом.
 * `protected`-пропы сюда не вносятся — их снимает общий фильтр `propControls`.
 */
export const NON_EDITABLE = new Set([
	'ctrl',
	// Имя места детали чужой разметки — ставит библиотека, а не потребитель
	'embedded',
	// Коллекционные: состав элементов задаёт само превью, а `trackBy` —
	// функция. Контрола, которым осмысленно править то и другое, не бывает
	'items',
	'trackBy',
	// Готовая коллекция снаружи — как `ctrl`, объект, а не значение
	'engine',
	// Якорь — DOM-элемент, как `ctrl` и `engine`: вводить в контрол нечего
	'anchor_anchor',
])

export function describeProp(componentId: string, prop: string): string | undefined {
	return OWN[componentId]?.[prop] ?? SHARED[prop] ?? PLUGIN[prop]
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
	if (optionsForProp(componentId, underscorePropNaming(prop.name))) return 'select'

	const ctor = firstCtorName(prop.type)

	if (ctor === 'Boolean') return 'switch'
	if (ctor === 'Number') return 'number'

	return 'text'
}

/**
 * Полное описание контрола для одного пропа.
 *
 * Умолчание — из самой декларации: его кладёт туда setup при сборке дескриптора
 * (`withClassDefault`, у пропа плагина — `definePlugin`), и своего пути к
 * `defaultValues` стенду больше не нужно. Заодно уходит старая натяжка:
 * умолчания компонента подставлялись и пропам фасада коллекции, у которого
 * свой класс.
 *
 * Значим ключ, а не значение — ровно как в setup: `closable` у элемента Tabs и
 * Tags объявлен с умолчанием `undefined`, и проверка `!== undefined` спутала бы
 * его с пропом, у которого умолчания нет вовсе.
 *
 * Имя — то, которым проп пишут в разметке (`underscorePropNaming`). У пропов
 * компонента и коллекции оно совпадает с именем из декларации, а плагинные
 * перестают сталкиваться с одноимёнными: `placement` есть и у Select, и у
 * якоря. По этому же имени ищутся описание, список значений и пресет.
 */
export function propControl(
	componentId: string,
	prop: IPropDeclaration,
	owner: TPropOwner = { scope: 'component' },
): TPropControl {
	const name = underscorePropNaming(prop.name)

	const control: TPropControl = {
		...owner,
		name,
		kind: controlKind(componentId, prop),
		options: optionsForProp(componentId, name),
		description: describeProp(componentId, name) ?? '',
		preset: presetForProp(componentId, name),
	}

	if (Object.hasOwn(prop, 'default')) control.default = prop.default

	return control
}

/**
 * Есть ли у пропа строка на странице.
 *
 * `protected` — вычисляемые наружу значения (`classes`, `aria`, `dataset`,
 * `present`, `styles` плагинов раскладки): аксессор их не пишет вовсе, и
 * контрол для них был бы обманом. `NON_EDITABLE` — по имени из разметки.
 */
function isEditable(prop: IPropDeclaration): boolean {
	return !prop.protected && !NON_EDITABLE.has(underscorePropNaming(prop.name))
}

/**
 * По алфавиту: порядок объявления идёт от слоя наследования, а не от смысла, и
 * искать в нём глазами дольше, чем прочитать список.
 */
function byName(a: TPropControl, b: TPropControl): number {
	return a.name.localeCompare(b.name)
}

/**
 * Строки страницы компонента по группам владельцев.
 *
 * Один источник на всех, кто считает строки: страницу, проверку манифеста и
 * дымовой тест. Пока фильтр был продублирован в каждом, плагинные пропы
 * разошлись бы по ним наверняка.
 *
 * Плагинные — из `descriptor.plugins`, а не из плоского `getProps()`: он не
 * говорит, какому плагину проп принадлежит, а без адреса второй колонке некуда
 * его записать. Плагины есть только у компонентного дескриптора: фасад
 * коллекции работает с bundle компонента.
 */
export function propControls(entry: TComponentEntry): TPropControlGroups {
	const descriptor = entry.descriptor()
	const collectionProps = entry.collectionDescriptor?.().props ?? []

	return {
		componentControls: descriptor.props
			.filter(isEditable)
			.map((prop) => propControl(entry.id, prop))
			.sort(byName),
		collectionControls: collectionProps
			.filter(isEditable)
			.map((prop) => propControl(entry.id, prop, { scope: 'collection' }))
			.sort(byName),
		pluginControls: descriptor.plugins
			.flatMap(({ ctor, props }) =>
				props.filter(isEditable).map((prop) =>
					propControl(entry.id, prop, {
						scope: 'plugin',
						plugin: { ctor, name: prop.name.name },
					}),
				),
			)
			.sort(byName),
	}
}
