import type { IRadioGroup, IRadioGroupItem, TRadioGroupCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TCollectionBundlesPlugin } from '../../collection'

/**
 * TRadioGroupNamePlugin — общий `name` радио группы.
 *
 * Без общего `name` браузер не соберёт нативные радио в группу: не будет ни
 * стрелок, ни одной остановки Tab, ни снятия отметки с соседа. Поэтому имя —
 * механизм документа, а не значение группы: ядро держит только `name`, который
 * задал потребитель (он же уходит в форму), а раздаёт имя радио этот плагин.
 * Группе без своего имени он даёт `id` её монтирования (`createId`): он один на
 * сервере и в браузере, и две безымянные группы на странице не сольются.
 *
 * Радио плагин узнаёт из коллекции группы (`engine:bound`) и пишет имя каждому:
 * сразу, на смену состава (`change:items`) и на смену имени группы
 * (`change:name`). Запись того же имени радио гасит сам. Движок привязывается
 * при сборке, до первой отрисовки, — радио из данных получают имя уже в
 * серверной разметке.
 */
export class TRadioGroupNamePlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const group = ctx.getInstance<IRadioGroup>()

		if (!group) return

		const unnamed = ctx.createId('group')
		const name = (item: IRadioGroupItem): void => {
			item.name = group.name || unnamed
		}

		ctx.get(TCollectionBundlesPlugin)?.events.on(
			'engine:bound',
			(engine: TRadioGroupCollection) => {
				const radios = engine.extensions.batch
				const nameAll = (): void => radios.items.forEach(name)

				nameAll()

				this._listenTo(engine.extensions.plain.events, 'change:items', nameAll)
				this._listenTo(group.events, 'change:name', nameAll)
			},
		)
	}
}
