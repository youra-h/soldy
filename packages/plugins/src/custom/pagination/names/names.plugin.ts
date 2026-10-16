import type { IPagination } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { TTranslations } from '../../../locale/types'

/**
 * TPaginationNamesPlugin — имена стрелок пагинации от локали: в `prevAria` и
 * `nextAria`. Стрелка без текста для скринридера безымянна.
 *
 * Имени ряду плагин не пишет: что листают — таблицу, ленту, результаты
 * поиска, — знает только приложение, и `nav` называет оно (`aria_label`,
 * `aria_labelledBy`). Имя из локали рядом с ними дало бы одному имени два
 * входа. Страницы называет их текст — номер или текст страницы.
 */
export class TPaginationNamesPlugin extends TNamesPlugin<IPagination> {
	protected override _name(owner: IPagination, translations: TTranslations): void {
		owner.prevAria.add('aria-label', translations.pagination.prev)
		owner.nextAria.add('aria-label', translations.pagination.next)
	}
}
