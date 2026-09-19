import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'

/**
 * TLabelNestedWarnPlugin — предупреждает, если внутри корня-`label` подписи
 * `Label` оказался другой `label`.
 *
 * HTML запрещает `label` внутри `label`. Верный знак такой ошибки — радио,
 * положенное в подпись без `tag="span"`: корень `RadioGroup.Item` — тоже
 * `label`. Разметка при этом выглядит правильно, поэтому без предупреждения
 * ошибку видно только валидатором.
 *
 * Диагностика, не защита: исключение не бросаем. Корень подписи — не `label`
 * (задан другой `tag`) — вкладывать нечего, проверка молчит.
 *
 * Узел берётся у `TElementPlugin` из общего bundle: сразу, если элемент уже
 * есть, иначе по событию `ready`. К `ready` контрол из слота уже в DOM. До
 * монтирования (в т.ч. SSR) узла нет — проверка молчит.
 */
export class TLabelNestedWarnPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const elementPlugin = ctx.get(TElementPlugin)

		if (!elementPlugin) return

		const check = (el: Element | null): void => {
			if (!el || el.localName !== 'label' || !el.querySelector('label')) return

			console.warn(
				'[soldy] Label: внутри подписи оказался ещё один <label> — HTML запрещает ' +
					'вкладывать их друг в друга. Корень RadioGroup.Item — <label>: внутри ' +
					'Label рисуйте его с tag="span".',
			)
		}

		if (elementPlugin.element) {
			check(elementPlugin.element)
			return
		}

		const onReady = (el: Element): void => {
			elementPlugin.events.off('ready', onReady)
			check(el)
		}

		elementPlugin.events.on('ready', onReady)
	}
}
