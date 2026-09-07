/**
 * TPluginPropsExtension — начальные значения пропсов, которыми владеет плагин.
 *
 * Ядро свои пропсы получает через конструктор: `new ctor(props)`. Плагины —
 * нет. Бандл собирается после инстанса и знает только `options` дескриптора,
 * а пропсы потребителя до плагина не доходят вовсе. Дальше остаётся лишь
 * `bindInput` адаптера, но он подписан на *изменение*: во Vue это `watch` без
 * `immediate`, и начальное значение он пропускает.
 *
 * Итог без этого расширения: `<Button aria_label="Закрыть">` при монтировании
 * имя не получает — оно появляется, только если значение потом поменять.
 *
 * Почему расширение, а не шаг внутри createAdapterContext. Расширение —
 * объявленный механизм этого слоя: оно видно в списке, подключается по
 * условию и его можно не подключать. Незаметный цикл в конструкторе контекста
 * был бы вторым, необъявленным путём входа пропсов рядом с `bindInput`.
 *
 * Плагинные пропсы берутся из `descriptor.plugins`, где они перечислены явно,
 * а не вычисляются из «этим свойством владеет не инстанс». Первое — контракт,
 * второе — догадка.
 */

import type { IAdapterContext } from '../context'
import { underscorePropNaming } from '../../common'

export class TPluginPropsExtension {
	constructor(context: IAdapterContext) {
		const bundle = context.bundle

		if (!bundle) return

		for (const definition of context.descriptor.plugins) {
			const plugin = bundle.get(definition.ctor) as Record<string, any> | undefined

			if (!plugin) continue

			for (const prop of definition.props ?? []) {
				// protected-пропсы плагин вычисляет сам, снаружи их не пишут
				if (prop.protected) continue

				// Имя с неймспейсом — то же, что ищет bindInput. Оба варианта
				// нужны потому же, почему и там: адаптеры зовут проп
				// `aria_label`, а тесты и headless-код — просто `label`.
				const value =
					context.props[underscorePropNaming(prop.name)] ?? context.props[prop.name.name]

				if (value === undefined) continue

				if (prop.set) {
					prop.set(plugin, value)
					continue
				}

				plugin[prop.name.name] = value
			}
		}
	}
}
