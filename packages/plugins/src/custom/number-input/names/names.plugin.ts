import type { INumberInput } from '@soldy-ui/core'
import { TClearableNamesPlugin } from '../../clearable/names'
import { formatName } from '../../../locale/locale'
import type { TTranslations } from '../../../locale/types'

/**
 * TNumberInputNamesPlugin — имена кнопок поля числа от локали, вместе с именем
 * поля: «Увеличить Количество», «Уменьшить Количество», «Очистить Количество».
 *
 * Кнопки шага не остановки Tab, но скринридер их находит и жмёт, и на форме с
 * тремя полями числа шесть одинаковых «Увеличить, кнопка» не различить. Как имя
 * складывается с именем поля, решают шаблоны локали (`numberInput.increment`,
 * `numberInput.decrement`). Имя кнопки очистки — как у любого поля
 * (`TClearableNamesPlugin`): плагин имён у компонента один, и наследник пишет
 * имена всех его кнопок.
 */
export class TNumberInputNamesPlugin extends TClearableNamesPlugin<INumberInput> {
	protected override _name(owner: INumberInput, translations: TTranslations): void {
		super._name(owner, translations)

		const { increment, decrement } = translations.numberInput

		owner.decrementAria.add('aria-label', formatName(decrement, owner.name))
		owner.incrementAria.add('aria-label', formatName(increment, owner.name))
	}
}
