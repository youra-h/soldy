import {
	TCollectionExtension,
	CalendarDescriptor,
	CalendarCollectionDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	useCollectionAdapter,
	useIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseCalendar, { type CalendarProps } from './base.component'

/**
 * Логики здесь нет: состав дней, выбор, фокус, листание и панели выбора
 * месяца и года — расширения коллекции, клавиши и нажатия — плагины
 * календаря. Разметка раскладывает то, что они отдали.
 *
 * Коллекция своя всегда: движка снаружи календарь не принимает — дни кладёт
 * в него вид по месяцам сеток, и ключ сверки у них — дата.
 */
export default {
	name: '_Calendar',
	extends: BaseCalendar,
	setup(props: CalendarProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(CalendarDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			CalendarCollectionDescriptor(),
			{ props, options: { owner: adapter.instance } },
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		return {
			...refs,
			...refsCollection,
			/**
			 * Панели выбора месяца и года — для кнопок их шапки: они только зовут
			 * команды расширения. Панель телепортирована, и плагин указателя на
			 * корне её нажатий не видит.
			 */
			picker: collectionAdapter.instance.extensions.picker,
			/**
			 * Одна иконка на все стрелки: роли «влево» в контракте иконок нет, и
			 * ту стрелку, что смотрит в начало строки, зеркалит тема.
			 */
			arrowIconTag: useIcon('arrowRight'),
		}
	},
}
