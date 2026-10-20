import type { ITextarea } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TAriaPlugin } from '../../component-view'
import type { IAriaParts } from '../../component-view'

/** Ссылок на свои части нет: счётчик не рисуется. */
const NO_PARTS: IAriaParts = {}

/**
 * TTextareaIdsPlugin — связка «поле ↔ счётчик символов» Textarea в документе.
 *
 * Пока счётчик включён (`counter`), его `id` — в его набор (`counterAria`), а
 * ссылка на него — в `aria-describedby` поля: скринридер читает «12 / 200»
 * вместе с полем, на фокусе, а не на каждый символ — живого региона у
 * счётчика нет. Выключили — сняты оба: счётчика нет в документе, и ссылка
 * вела бы в пустоту.
 *
 * Ссылку плагин пишет не в набор поля сам, а третьим входом его `TAriaPlugin`
 * (`parts`): `aria-describedby` сливает он — справка поля формы, свои части,
 * своё `aria_describedBy`, — и второй писатель того же атрибута стёр бы чужое.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, и на смену `counter` — связка есть уже в первой (и
 * серверной) отрисовке.
 *
 * Шина поля бывает долговечнее плагина — приложение передаёт свой `ctrl`, —
 * поэтому подписка через `_listenTo`.
 */
export class TTextareaIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const textarea = ctx.getInstance<ITextarea>()

		if (!textarea) return

		const counterId = ctx.createId('counter')
		const aria = ctx.get(TAriaPlugin)

		const link = (): void => {
			const shown = textarea.counter

			textarea.counterAria.add('id', shown ? counterId : null)

			if (aria) aria.parts = shown ? { describedBy: counterId } : NO_PARTS
		}

		link()
		this._listenTo(textarea.events, 'change:counter', link)
	}
}
