import type { TFieldPart } from '../segments'
import type { TDateFieldPart, TDateInputKind, TDateInputParts } from '../types'

/** Кусок формата поля: часть с её правилом или литерал между частями — как его отдал Intl. */
export type TDateFieldToken = TFieldPart | { readonly type: 'literal'; readonly text: string }

/**
 * Что группа узнаёт у форматтера поля: формат Intl, его опорная строка и
 * цифры локали.
 */
export type TGroupContext = {
	/** Разрешённые опции форматтера поля: язык, цикл часов */
	readonly resolved: Intl.ResolvedDateTimeFormatOptions
	/** Опорный момент формата, разобранный форматтером поля */
	readonly sample: readonly Intl.DateTimeFormatPart[]
	/** Григорианский год опорного момента: по нему виден сдвиг года календаря поля */
	readonly sampleYear: number
	/** Цифры системы счисления локали — от нуля до девяти */
	readonly digits: readonly string[]
}

/**
 * Группа частей в формате локали — дата или время: правила своих частей и
 * всё, что про них знает разбор текста.
 */
export type TPartGroup = {
	/**
	 * Части группы, которые формат ждёт от Intl: у времени период суток — только
	 * при 12-часовом цикле
	 */
	readonly parts: readonly TFieldPart[]
	/** Запасной формат группы — ISO; нужен, только если Intl отдал не те части */
	readonly isoTokens: readonly TDateFieldToken[]
	/**
	 * Числа частей группы из вставленного текста: `read` — число группы цифр
	 * части, слова (период суток) группа ищет в `text` сама. Не собрать —
	 * `undefined`
	 */
	fromText(read: (type: TDateFieldPart) => number, text: string): TDateInputParts | undefined
	/** Числа частей текущего момента — с них начинает ↑/↓ пустая часть */
	now(): TDateInputParts
}

/**
 * Вид группы — дата или время: кусок значения, опции Intl и группа в
 * формате локали. Значение поля — куски групп его вида через `T`.
 */
export type TGroupSpec = {
	/** Опции Intl, которыми формат поля пишет части группы */
	readonly options: Intl.DateTimeFormatOptions
	/** Числа частей из куска значения (`YYYY-MM-DD`, `HH:mm`); не кусок — `undefined` */
	parse(text: string): TDateInputParts | undefined
	/** Кусок значения по числам частей; числа нет или такого нет — `undefined` */
	compose(parts: TDateInputParts): string | undefined
	/** Порядок двух проверенных кусков: меньше нуля — `a` раньше */
	compare(a: string, b: string): number
	/** Группа в формате локали */
	create(context: TGroupContext): TPartGroup
}

/**
 * Формат поля в локали и виде — всё, что поле берёт у локали: порядок
 * частей и литералы между ними, правила частей, направление ряда, цифры и
 * имена частей для скринридера. Один объект на тег локали и вид поля.
 *
 * Части даты — в календаре поля: буддийском, если календарь подписей
 * буддийский (`th-TH` вводит год 2569, как его пишет заголовок календаря),
 * иначе в григорианском. У японского календаря эра меняется посреди года, а у
 * `roc` годы до 1912 идут назад от эры, — части эры у поля нет, и годы у них
 * григорианские.
 */
export interface IDateFieldFormat {
	/** Вид поля: из каких групп собирается значение */
	readonly kind: TDateInputKind
	/**
	 * Части и литералы в порядке формата Intl: день, месяц, час и минута —
	 * двумя цифрами, год — полностью. Литералы — как есть, с пробелами
	 * (`ko-KR` — «. ») и метками направления (`ar-EG` — RLM)
	 */
	readonly tokens: readonly TDateFieldToken[]
	/** Части по порядку формата */
	readonly parts: readonly TFieldPart[]
	/** Группы вида по порядку значения: дата, затем время */
	readonly groups: readonly TPartGroup[]
	/**
	 * Направление ряда частей — по первому сильному знаку даты в локали:
	 * `ar-EG` — справа налево (RLM в литералах), `he-IL` — слева направо, как
	 * цифры в тексте на иврите. Сильного знака нет — слева направо
	 */
	readonly direction: 'ltr' | 'rtl'
	/** Язык ряда — локаль форматтера: тег, которого нет у движка, — `en-US` */
	readonly lang: string
	/** Цифры системы счисления локали — от нуля до девяти, по знаку на цифру */
	readonly digits: readonly string[]
	/** Имена частей для скринридера — на языке локали (`день`, `час`, `AM/PM`) */
	readonly names: Readonly<Record<TDateFieldPart, string>>
}
