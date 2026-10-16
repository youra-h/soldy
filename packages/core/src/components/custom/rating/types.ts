import type {
	IInputControl,
	IInputControlProps,
	TInputControlEvents,
} from '../../base/input-control'
import type { TEvented, TValuePayload } from '../../../common'
import type { ISlidable, TSlideSnap } from '../slide'

/**
 * CSS-переменные узла — и только они. Доля заливки звезды — числом от 0 до 1,
 * без единиц: тема умножает на неё ширину слоя заливки.
 */
export type TRatingStyle = Record<`--${string}`, string>

/**
 * Звезда — выход ядра для разметки. Своего экземпляра у звезды нет:
 * потребитель её не адресует, число звёзд задаёт `max` (AGENTS.md, «Часть или
 * слот»).
 */
export type TRatingStar = {
	/**
	 * Значение звезды — её номер: 1 у первой, `max` у последней. Нажатие на её
	 * конец ставит оценку, равную ему
	 */
	value: number
	/**
	 * `--so-rating-fraction` — какая доля звезды залита: от предпросмотра,
	 * пока он идёт, иначе от значения
	 */
	style: TRatingStyle
}

export type TRatingEvents = TInputControlEvents<number> & {
	/** change:max */
	'change:max': (value: number) => void
	/** change:step */
	'change:step': (value: number) => void
	/**
	 * Предпросмотр сменился: оценка, которую поставит нажатие под указателем;
	 * указатель ушёл — `undefined`
	 */
	'change:preview': (value: number | undefined) => void
	/**
	 * Смена режима щелчка — только ради контракта перетаскивания (`ISlidable`):
	 * его слушает плагин указателя. Режим у оценки один, `none`, и событие не
	 * приходит никогда.
	 */
	'change:snap': (value: TSlideSnap) => void
	/**
	 * Пользователь поставил оценку: отпустил указатель, если за нажатие и
	 * протяжку значение сменилось, или сдвинул его клавишей. `change:value`
	 * приходит на каждую звезду протяжки, а это событие — одно на действие: по
	 * нему сохраняют и отправляют.
	 */
	commit: (payload: TValuePayload<number>) => void
}

export interface IRatingProps extends IInputControlProps<number> {
	/**
	 * Сколько звёзд — и наибольшая оценка. Целое число: дробная часть
	 * отбрасывается
	 */
	max?: number
	/** Шаг оценки: `1` — целые звёзды, `0.5` — половинки */
	step?: number
}

export interface IRating extends IInputControl<number, IRatingProps, TRatingEvents>, ISlidable {
	/** Сколько звёзд — и наибольшая оценка */
	max: number
	/** Шаг оценки */
	step: number
	/**
	 * Шина оценки. Объявлена здесь, потому что предки объявляют её по-разному:
	 * компонент — полной картой, перетаскивание — подпиской на смену щелчка.
	 * Полная карта подходит под обе.
	 */
	readonly events: TEvented<TRatingEvents>
	/**
	 * Предпросмотр: оценка, которую поставит нажатие под указателем. Указателя
	 * над звёздами нет, оценку менять нельзя или её только что сдвинула
	 * клавиша — `undefined`
	 */
	readonly preview: number | undefined
	/** Звёзды — выход для разметки, по одной на единицу шкалы */
	readonly stars: TRatingStar[]
	/**
	 * Указатель над долей хода `fraction` — предпросмотр той оценки, которую
	 * поставит нажатие; `undefined` — указатель ушёл. У выключенной оценки и
	 * оценки только для показа предпросмотра нет
	 */
	hover(fraction: number | undefined): void
}
