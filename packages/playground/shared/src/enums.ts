import type {
	TComponentSize,
	TComponentVariant,
	TButtonView,
	TAccordionView,
	TAccordionArrowPlacement,
	TListBoxView,
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
} from '@soldy/core'

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
 * `TButtonView` и забыли сюда — `vue-tsc` покажет, какого именно не хватает.
 * Ровно этой сверки не было у прежнего демо, где такие же списки лежали в
 * `playgrounds/Tabs.vue` и тихо устаревали.
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

export const BUTTON_VIEWS = enumOf<TButtonView>()(['filled', 'plain', 'outlined', 'none'])

export const ACCORDION_VIEWS = enumOf<TAccordionView>()(['plain', 'outlined', 'filled'])

export const ACCORDION_ARROW_PLACEMENTS = enumOf<TAccordionArrowPlacement>()(['start', 'end'])

export const LIST_BOX_VIEWS = enumOf<TListBoxView>()(['plain', 'outlined', 'filled'])

export const SKELETON_SHAPES = enumOf<TSkeletonShape>()(['rect', 'rounded', 'circle'])

export const SKELETON_ANIMATIONS = enumOf<TSkeletonAnimation>()(['pulse', 'wave', 'none'])

export const TABS_ORIENTATIONS = enumOf<TTabsOrientation>()(['horizontal', 'vertical'])

export const TABS_ALIGNMENTS = enumOf<TTabsAlignment>()(['start', 'center', 'end', 'stretch'])

export const TABS_POSITIONS = enumOf<TTabsPosition>()(['start', 'end'])

export const TABS_VIEWS = enumOf<TTabsView>()(['line', 'contained', 'outline'])

export const FRAME_POSITIONS = enumOf<TFramePosition>()(['fixed', 'absolute'])

export const DIRECTIONS = enumOf<TDirection>()(['ltr', 'rtl', 'inherit'])

export const SCROLL_BEHAVIORS = enumOf<TScrollBehavior>()(['none', 'instant', 'smooth'])

export const SELECTION_MODES = enumOf<TSelectionMode>()(['none', 'single', 'multiple'])

/** Теги, которыми осмысленно подменять корень компонента через `tag`. */
export const HTML_TAGS = ['div', 'span', 'button', 'a', 'section', 'li'] as const
