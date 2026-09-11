export type TConstructor<T = object> = new (...args: any[]) => T

export type TAbstractConstructor<T = object> = abstract new (...args: any[]) => T

export type TComponentVariant = 'normal' | 'accent' | 'positive' | 'negative' | 'caution'

/**
 * Шкала размеров, по возрастанию — на порядок опирается `shiftSize`.
 *
 * Единственное перечисление, объявленное массивом, а не union'ом, и на то есть
 * причина: значения нужны ядру **в рантайме**. Раньше их было два — union здесь
 * и приватный `SIZE_SCALE` в `utility/size.ts`, две руками набранные копии
 * одних и тех же пяти строк.
 *
 * Остальные перечисления (`TButtonView`, `TTabsAlignment`, …) остаются
 * обычными union'ами: рантайм-потребителей у них в библиотеке нет, а списки
 * значений нужны только стенду — он и держит их у себя, со сверкой на
 * компиляции. Класть их в ядро значило бы усложнять компоненты ради
 * инструмента.
 */
export const COMPONENT_SIZES = ['sm', 'normal', 'lg', 'xl', '2xl'] as const

export type TComponentSize = (typeof COMPONENT_SIZES)[number]

export type TValuePayload<TValue> = {
	newValue: TValue
	oldValue: TValue
}

export type TScrollBehavior = 'none' | 'instant' | 'smooth'
