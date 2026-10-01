import type { IModalLayer } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TModalIdsPlugin — имя модального слоя в документе: панель называет её
 * заголовок.
 *
 * `id` заголовка — в `titleAria`, который разметка раскладывает на заголовок,
 * и ссылка на него `aria-labelledby` — в `aria` панели. Обе стороны пишутся
 * здесь, от одного `id`. Ссылка стоит всегда: заголовок рисуется всегда.
 *
 * Общая часть окна и выезжающей панели — как и вся модальность
 * (`TModalLayer`). Своё сверх неё у окна — тело предупреждения
 * (`TDialogIdsPlugin`).
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — имя есть уже в первой (и серверной) отрисовке.
 */
export class TModalIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const layer = ctx.getInstance<IModalLayer>()

		if (!layer) return

		const titleId = ctx.createId('title')

		layer.titleAria.add('id', titleId)
		layer.aria.add('aria-labelledby', titleId)
	}
}
