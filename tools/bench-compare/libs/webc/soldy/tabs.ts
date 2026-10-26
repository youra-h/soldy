import '@soldy-ui/webc/tabs'
import { COLLECTION_ITEMS } from '../../../data'
import { h, slotted, so } from '../dom'

export default () =>
	so('div', 'so-tabs', {}, [
		...COLLECTION_ITEMS.map((item, index) =>
			so('div', 'so-tabs-item', { active: index === 0, ...item }),
		),
		...COLLECTION_ITEMS.map((item) =>
			slotted(
				so('div', 'so-tabs-content', { value: item.value }, [
					h('div', { style: 'padding:12px' }, [`Панель «${item.text}»`]),
				]),
				'content',
			),
		),
	])
