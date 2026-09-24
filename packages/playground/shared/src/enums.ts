/// <reference types="@soldy-ui/theme-oren" />

import type {
	TComponentSize,
	TComponentVariant,
	TButtonView,
	TCheckBoxView,
	TLabelPosition,
	TRadioGroupView,
	TAccordionArrowPlacement,
	TListContentFit,
	TListIndicator,
	TSkeletonShape,
	TSkeletonAnimation,
	TTabsOrientation,
	TTabsAlignment,
	TTabsPosition,
	TTabsView,
	TFramePosition,
	TDirection,
	TScrollBehavior,
	TSelectionMode,
	TSelectEditableMode,
	TSelectPlacement,
	TTagsOverflow,
	TPopoverPlacement,
	TTooltipPlacement,
	TTooltipType,
} from '@soldy-ui/core'
import type { TFramePlacement } from '@soldy-ui/plugins'

/**
 * Списки допустимых значений перечислимых пропов.
 *
 * **Почему здесь, а не в библиотеке.** В рантайме у таких пропов лежит просто
 * `String`, а значения существуют только как TS-типы — типы же стираются. То
 * есть массив придётся написать руками в любом случае, вопрос лишь где.
 * Проверка показала: рантайм-потребителей у этих списков в библиотеке нет ни
 * одного (единственное исключение — шкала размеров, она нужна `shiftSize` и
 * потому живёт в ядре). Класть остальные пятнадцать в компоненты значило бы
 * усложнять их ради стенда.
 *
 * **Почему это не разъедется с библиотекой.** Каждый список сверяется с
 * исходным типом на компиляции — см. `enumOf` ниже. Добавили значение в
 * `TTabsAlignment` и забыли сюда — `vue-tsc` покажет, какого именно не хватает.
 * Ровно этой сверки не было у прежнего демо, где такие же списки лежали в
 * `playgrounds/Tabs.vue` и тихо устаревали.
 *
 * **Значения оформления — из темы.** `variant`, `view`, `shape` и `animation`
 * объявляет не библиотека, а тема (корневой `AGENTS.md`, «Оформление: значения
 * объявляет тема»): реестры ядра пусты. Стенд рисует тему oren, поэтому её
 * объявление подключено к программе типов директивой выше, и эти списки
 * сверяются с ним. Тема добавила вид — `vue-tsc` попросит его и здесь.
 */

/**
 * Требует, чтобы список покрыл union целиком.
 *
 * Лишние значения ловит констрейнт `readonly TUnion[]`, недостающие —
 * пересечение с кортежем-подсказкой: если что-то из union не попало в список,
 * тип аргумента становится невыполнимым и компилятор называет пропущенное.
 */
function enumOf<TUnion extends string>() {
	return <const TList extends readonly TUnion[]>(
		values: TList &
			([Exclude<TUnion, TList[number]>] extends [never]
				? unknown
				: { 'не хватает значения': Exclude<TUnion, TList[number]> }),
	): TList => values as TList
}

/**
 * Шкала размеров объявлена и в ядре (`COMPONENT_SIZES` — её читает `shiftSize`),
 * но наружу оттуда не выводится: экспортировать значение ради стенда значило бы
 * менять библиотеку под инструмент. Здесь список свой, а от расхождения
 * страхует `enumOf<TComponentSize>()` — тип-то в ядре из массива и выведен.
 */
export const COMPONENT_SIZES = enumOf<TComponentSize>()(['sm', 'normal', 'lg', 'xl', '2xl'])

export const COMPONENT_VARIANTS = enumOf<TComponentVariant>()([
	'normal',
	'accent',
	'positive',
	'negative',
	'caution',
])

/**
 * Вид кнопки — он же вид строк, которые рисует Button: у ListBox, Accordion и
 * Tags `view` — псевдоним `TButtonView`, и список у них этот же.
 */
export const BUTTON_VIEWS = enumOf<TButtonView>()(['filled', 'plain', 'outlined', 'none'])

export const CHECK_BOX_VIEWS = enumOf<TCheckBoxView>()(['outlined', 'filled', 'plain'])

/** С какой стороны от контрола стоит текст подписи. */
export const LABEL_POSITIONS = enumOf<TLabelPosition>()(['start', 'end', 'top', 'bottom'])

/** Чем отмечено выбранное радио: точкой внутри кольца или утолщённым кольцом. */
export const RADIO_GROUP_VIEWS = enumOf<TRadioGroupView>()(['dot', 'ring'])

export const ACCORDION_ARROW_PLACEMENTS = enumOf<TAccordionArrowPlacement>()(['start', 'end'])

/** Общее для ListBox и Select: что делать с не помещающимся текстом. */
export const LIST_CONTENT_FITS = enumOf<TListContentFit>()(['truncate', 'wrap', 'expand'])

/** Общее для ListBox и Select: где стоит отметка выбранного — и стоит ли. */
export const LIST_INDICATORS = enumOf<TListIndicator>()(['none', 'start', 'end'])

export const SKELETON_SHAPES = enumOf<TSkeletonShape>()(['rect', 'rounded', 'circle'])

export const SKELETON_ANIMATIONS = enumOf<TSkeletonAnimation>()(['pulse', 'wave', 'none'])

export const TABS_ORIENTATIONS = enumOf<TTabsOrientation>()(['horizontal', 'vertical'])

export const TABS_ALIGNMENTS = enumOf<TTabsAlignment>()(['start', 'center', 'end', 'stretch'])

export const TABS_POSITIONS = enumOf<TTabsPosition>()(['start', 'end'])

export const TABS_VIEWS = enumOf<TTabsView>()(['line', 'contained', 'outline'])

/** Что делать с тегами, которым не хватило ширины ряда. */
export const TAGS_OVERFLOWS = enumOf<TTagsOverflow>()(['wrap', 'scroll', 'arrows', 'popover'])

export const FRAME_POSITIONS = enumOf<TFramePosition>()(['fixed', 'absolute'])

export const DIRECTIONS = enumOf<TDirection>()(['ltr', 'rtl', 'inherit'])

export const SCROLL_BEHAVIORS = enumOf<TScrollBehavior>()(['none', 'instant', 'smooth'])

export const SELECTION_MODES = enumOf<TSelectionMode>()(['none', 'single', 'multiple'])

/** Что делает ввод текста в поле Select при `editable: true`. */
export const SELECT_EDITABLE_MODES = enumOf<TSelectEditableMode>()(['none', 'search', 'filter'])

/** С какой стороны поля Select открывается панель. */
export const SELECT_PLACEMENTS = enumOf<TSelectPlacement>()(['auto', 'top', 'bottom'])

/**
 * Сторона и выравнивание панели Popover у триггера. Значения те же, что у
 * `anchor_placement`, но тип свой — ядра: проп принадлежит поповеру.
 */
export const POPOVER_PLACEMENTS = enumOf<TPopoverPlacement>()([
	'bottom-start',
	'bottom-end',
	'top-start',
	'top-end',
])

/**
 * Сторона и выравнивание подсказки у триггера. Значения те же, что у
 * `anchor_placement`, но тип свой — ядра: проп принадлежит подсказке.
 */
export const TOOLTIP_PLACEMENTS = enumOf<TTooltipPlacement>()([
	'bottom-start',
	'bottom-end',
	'top-start',
	'top-end',
])

/** Чем подсказка служит триггеру: описанием или именем. */
export const TOOLTIP_TYPES = enumOf<TTooltipType>()(['description', 'label'])

/**
 * Сторона и выравнивание панели у якоря — `anchor_placement`. Тип объявляет не
 * ядро, а `TAnchorPlugin`: проп принадлежит плагину.
 */
export const FRAME_PLACEMENTS = enumOf<TFramePlacement>()([
	'bottom-start',
	'bottom-end',
	'top-start',
	'top-end',
])

/**
 * Теги, которыми осмысленно подменять корень компонента через `tag`. `label` —
 * умолчание корня подписи Label: без него строка `tag` на её странице не
 * нашла бы умолчания среди значений.
 */
export const HTML_TAGS = ['div', 'span', 'label', 'button', 'a', 'section', 'li'] as const
