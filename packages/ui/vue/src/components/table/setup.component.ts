import { TCollectionExtension, TableDescriptor, TableCollectionDescriptor } from '@soldy-ui/setup'
import {
	useAdapter,
	useCollectionAdapter,
	useIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseTable, { type TableProps } from './base.component'

/**
 * Два адаптерных контекста, как у ListBox: собственный (язык, имя чекбокса
 * «выбрать все») и коллекционный (строки, колонки, выбор и сортировка). Второй
 * получает `owner` и общий `bundle`.
 *
 * Логики здесь нет: показанные колонки и строки, ячейки, счёт выбора и
 * порядок строк — расширения коллекции, а разметка раскладывает то, что они
 * отдали. Чекбоксы колонки выбора — экземпляры, которые держит таблица: их
 * отметку она пишет от выбора, а клик по ним — просьба, которую она выполняет
 * командой выбора.
 */
export default {
	name: '_Table',
	extends: BaseTable,
	setup(props: TableProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TableDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			TableCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `completeEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		return {
			...refs,
			...refsCollection,
			/** Методы коллекции рефами не пробрасываются — отдаём инстанс. */
			facade: collectionAdapter.instance,
			/**
			 * Чекбокс «выбрать все» — экземпляр, который держит таблица. Не проп
			 * (не меняется за время жизни компонента), поэтому отдаём инстансом,
			 * как `field` у Select, — `<CheckBox :ctrl="selectAll">` берёт его
			 * целиком.
			 */
			selectAll: collectionAdapter.instance.selectAll,
			sortIconTag: useIcon('arrowUpward'),
		}
	},
}
