/**
 * TSlotDeclaration — объявление слота: имя, scope и строка документации.
 *
 * Третья категория контракта рядом с пропсами и событиями, и такое же
 * объявление, как они: имя вынесено из ключа словаря `slots`, а наследование
 * слот знает сам (`IDeclaration`). Правило у него простое — слот наследника
 * встаёт на место родительского целиком: scope слота объявляют одним местом,
 * складывать там нечего (Button уточняет `default`, объявленный у
 * ComponentView, перечисляя scope заново).
 *
 * Неизменяемо и заморожено: объявление строится один раз на тип, и
 * родительские объявления делят все наследники.
 */

import type { ISlotDeclaration } from './contribution.types'
import type { IDeclaration } from './types'

export class TSlotDeclaration implements ISlotDeclaration, IDeclaration<TSlotDeclaration> {
	constructor(
		readonly name: string,
		readonly scope?: Record<string, unknown>,
		readonly description?: string,
	) {
		Object.freeze(this)
	}

	/** Ключ наследования — имя слота: два слота с одним именем у компонента не бывают. */
	get key(): string {
		return this.name
	}

	/** Родительское объявление не читается: своё заменяет его целиком. */
	inheritFrom(): TSlotDeclaration {
		return this
	}
}
