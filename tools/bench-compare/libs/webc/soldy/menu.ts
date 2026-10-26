import '@soldy-ui/webc/button'
import '@soldy-ui/webc/calendar'
import '@soldy-ui/webc/menu'
import { h, slotted, so } from '../dom'

const part = (is: string, props: Record<string, unknown> = {}, children: Node[] = []) =>
	so('div', is, props, children)
const shortcut = (text: string) => slotted(h('span', {}, [text]), 'trailing')

export default () =>
	so('span', 'so-menu', {}, [
		slotted(so('button', 'so-button', { text: 'Действия' }), 'trigger'),
		part('so-menu-group', { label: 'Вид' }, [
			part('so-menu-checkbox-item', { value: 'grid', text: 'Сетка', selected: true }),
			part('so-menu-checkbox-item', { value: 'ruler', text: 'Линейка' }),
		]),
		part('so-menu-separator'),
		part('so-menu-radio-group', { label: 'Сортировка', value: 'name' }, [
			part('so-menu-radio-item', { value: 'name', text: 'По имени' }),
			part('so-menu-radio-item', { value: 'date', text: 'По дате' }),
		]),
		part('so-menu-separator'),
		part('so-menu-item', { value: 'edit', text: 'Изменить' }, [shortcut('Ctrl+E')]),
		part('so-menu-item', { value: 'copy', text: 'Дублировать' }, [shortcut('Ctrl+D')]),
		part('so-menu-submenu', { value: 'share', text: 'Поделиться' }, [
			part('so-menu-item', { value: 'link', text: 'Ссылка' }),
			part('so-menu-item', { value: 'mail', text: 'Почта' }),
			part('so-menu-submenu', { value: 'messengers', text: 'Мессенджеры' }, [
				part('so-menu-item', { value: 'telegram', text: 'Telegram' }),
				part('so-menu-item', { value: 'whatsapp', text: 'WhatsApp' }),
			]),
		]),
		part('so-menu-popover-item', { value: 'due', text: 'Срок', lazyMount: true }, [
			so('div', 'so-calendar'),
		]),
		part('so-menu-item', { value: 'archive', text: 'В архив', disabled: true }),
		part('so-menu-separator'),
		part('so-menu-item', { value: 'remove', text: 'Удалить', variant: 'negative' }, [
			shortcut('Del'),
		]),
	])
