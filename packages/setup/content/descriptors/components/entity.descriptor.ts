/**
 * Дескриптор Entity — корень цепочки: пропсы и события адаптера у всех компонентов.
 *
 * Класса ядра у него нет: `ctrl`, `embedded`, `pluginProps`, `bundle:create` и
 * `plugin:event` принадлежат связке адаптера с инстансом, а не самому инстансу.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'

export const EntityDescriptor = defineDescriptor(() =>
	defineComponent({
		/**
		 * `ctrl` и `bundle:create` — обе половины связки адаптера с инстансом, поэтому
		 * живут вместе: `ctrl` вносит готовый инстанс снаружи, `bundle:create` отдаёт
		 * наружу плагины, появившиеся у этого инстанса при монтировании.
		 *
		 * `embedded` — имя места, если компонент — деталь разметки другого компонента
		 * soldy. Как и `ctrl`, проп адаптера, а не инстанса: триггеров нет, в инстанс
		 * он не пишется. Читает его `createAdapterContext` — для реестра плагинов.
		 *
		 * `pluginProps` и `plugin:event` — та же пара для плагинов, поставленных
		 * снаружи (`usePlugins`, `bundle.use`): значения их пропсов одним объектом
		 * `{ timer_ms: 500 }` и их события одним конвертом `{ name, args }`.
		 * Объявлены здесь, у всех компонентов: статический слой адаптеров знает их
		 * заранее, а контракт внешнего плагина — только в рантайме
		 * (`pluginContractOf`). Проп адаптера: в инстанс не пишется, разбирают его
		 * плагины монтирования (`TExternalPlugins`).
		 */
		contribution: {
			props: {
				ctrl: { type: Object },
				embedded: { type: String },
				pluginProps: { type: Object },
			},
			events: ['bundle:create', 'plugin:event'],
		},
	}),
)
