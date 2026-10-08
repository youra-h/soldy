import type { IField } from '@soldy-ui/core'
import type { TPluginEvents } from '../../../base'
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
 * переписывается.
 *
 * Ставится наследникам базы поля — текстовому полю и полю даты, — а через
 * `TDatePickerNamesPlugin` — DatePicker: плагин имён у компонента один, и
 * базе поля он не ставится. Дженерик по владельцу и событиям — для
 * наследника, у которого кнопок больше.
 */
export class TFieldNamesPlugin<
	TOwner extends IField<any, any, any> = IField<unknown>,
	TEvents extends TPluginEvents = TPluginEvents,
> extends TNamesPlugin<TOwner, TEvents> {
	protected override _name(owner: TOwner, translations: TTranslations): void {
		owner.clearAria.add('aria-label', formatName(translations.field.clear, owner.name))
	}

	protected override _watch(owner: TOwner, name: () => void): void {
		this._listenTo(owner.events, 'change:name', name)
	}
}
