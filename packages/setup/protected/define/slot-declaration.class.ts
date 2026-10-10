/**
 * TSlotDeclaration — объявление слота: имя, scope и строка документации.
 *
 * Третья категория контракта рядом с пропсами и событиями: имя вынесено из
 * ключа словаря `slots`, как у пропа. В отличие от пропа и плагина, слот не
 * наследуется: он описывает разметку компонента, а не экземпляр ядра, и
 * дескриптор держит только свои слоты (`TComponentDescriptor`). Поэтому
 * контракта наследования (`IDeclaration`) у слота нет — класть его поверх
 * родительского некуда.
 *
 * Неизменяемо и заморожено: объявление строится один раз на тип, и его делят
 * все монтирования.
 */

import type { ISlotDeclaration } from './contribution.types'

export class TSlotDeclaration implements ISlotDeclaration {
	constructor(
		readonly name: string,
		readonly scope?: Record<string, unknown>,
		readonly description?: string,
	) {
		Object.freeze(this)
	}
}
