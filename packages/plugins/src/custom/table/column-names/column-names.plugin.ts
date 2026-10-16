import type { ITableColumn } from '@soldy-ui/core'
import { formatName } from '../../../locale/locale'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/**
 * TTableColumnNamesPlugin — имя кнопки сортировки в заголовке колонки от
 * локали: в `sortAria`, вместе с подписью колонки, как у крестика тега
 * (`TTagsItemNamesPlugin`).
 *
 * Текста у кнопки нет — в ней одна стрелка, — а подпись колонки стоит рядом,
 * вне кнопки: заголовок назван подписью (`TTableColumnIdsPlugin`), и имя
 * кнопки в имя заголовка не входит. Ссылкой на подпись кнопку не называют:
 * своя кнопка потребителя в слоте заголовка с тем же текстом дала бы два
 * одинаковых имени.
 */
export class TTableColumnNamesPlugin extends TNamesPlugin<ITableColumn> {
	protected override _name(owner: ITableColumn, translations: TTranslations): void {
		owner.sortAria.add('aria-label', formatName(translations.table.sort, owner.text))
	}

	protected override _watch(owner: ITableColumn, name: () => void): void {
		this._listenTo(owner.events, 'change:text', name)
	}
}
