import type { IDateInput } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { allPartTypes } from '../parts'

/**
 * TDateInputIdsPlugin — `id` частей поля даты в документе.
 *
 * Пишет `id` каждой части в её набор (`segmentSets` поля), который ядро
 * раскладывает в `segments`. По нему часть ссылается на себя, когда её имя
 * собирают из её имени и имени поля (`aria-labelledby` на сенсорных
 * устройствах Apple — `TDateInputTouchPlugin`).
 *
 * `id` — от монтирования (`createId`) и типа части, а не от места в формате:
 * смена локали переставляет части, а их `id` остаются. Пишется при установке,
 * синхронно, — `id` есть уже в первой (и серверной) отрисовке. Пишется всем
 * типам частей, а не только частям формата: смена вида поля, точности времени
 * и локали добавляет части (время, секунду, период суток), и у них `id` уже
 * есть, кто бы ни прочёл набор первым.
 */
export class TDateInputIdsPlugin extends TBasePlugin<IDateInput> {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const owner = ctx.getInstance<IDateInput>()

		if (!owner) return

		for (const type of allPartTypes()) {
			owner.segmentSets(type).aria.add('id', ctx.createId(type))
		}
	}
}
