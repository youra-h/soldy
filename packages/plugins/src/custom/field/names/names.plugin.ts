import type { IField } from '@soldy-ui/core'
import { formatName } from '../../../locale/locale'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/**
 * TFieldNamesPlugin — имя кнопки очистки поля от локали: в `clearAria`,
 * вместе с именем поля — «Clear Город».
 *
 * Без имени поля на форме с пятью полями в списке элементов скринридера было
 * бы пять одинаковых «Clear, кнопка». Как имя складывается с именем поля,
 * решает шаблон локали (`field.clear`). Сменилось имя — имя кнопки
 * переписывается. Ставится текстовому полю и полю даты: кнопка — их общей
 * базы.
 */
export class TFieldNamesPlugin extends TNamesPlugin<IField<unknown>> {
	protected override _name(owner: IField<unknown>, translations: TTranslations): void {
		owner.clearAria.add('aria-label', formatName(translations.field.clear, owner.name))
	}

	protected override _watch(owner: IField<unknown>, name: () => void): void {
		this._listenTo(owner.events, 'change:name', name)
	}
}
