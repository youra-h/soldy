<script lang="ts">
import { Button } from '../../button'
import SetupMenuItem from './setup.component'

/**
 * Пункт-действие. Строку флажок рисует свою (`CheckboxItem.vue`): у него
 * отметка в начале строки и другое нажатие.
 *
 * Вокруг слотов значка и подсказки нет пробелов: пустую обёртку тема прячет
 * по `:empty`, и пробельный текст сделал бы её непустой.
 */
export default { ...SetupMenuItem, components: { Button } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
	>
		<!--
			Корень несёт состояние для темы (`data-highlighted`, `data-disabled`)
			и модификаторы размера меню и своего варианта, а строка красится от
			него: носитель `dataset` один.
		-->

		<!--
			Строка — `Button` над экземпляром пункта (`row`, `TItemRow` на
			`div`), как у ListBox: на ней ARIA пункта (роль `menuitem`,
			`tabindex="-1"` от меню) и DOM-фокус, когда пункт подсвечен. Своих
			роли и `tabindex` у строки нет — их несёт набор пункта. Размер и
			`disabled` ей пишет пункт, поэтому пропсов рядом с `ctrl` нет. Вида
			и варианта строка не получает: вид ей даёт тема по контексту, а цвет
			она берёт с пункта и панели.

			Нажатие — клик строки: Enter и пробел на ней превращает в клик сама
			строка (`TActionPlugin`), и путь у мыши и клавиатуры один. Решает
			меню (`adapters.menu.choose()`): выключенному пункту оно отказывает,
			а доступный выполняет и закрывается.
		-->
		<Button
			embedded="menu.row"
			:ctrl="row"
			@click="context?.adapters.menu.choose()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<!--
				Значок — слот `leading` в обёртке колонки. Обёртка есть у каждого
				пункта: пустая места не занимает, а если значок есть хоть у одного
				пункта меню, держит его колонку.
			-->
			<template #leading>
				<span class="so-menu-item__icon"><slot name="leading" /></span>
			</template>

			<slot :text="text">{{ text }}</slot>

			<!--
				Подсказка сочетания клавиш (`Ctrl+S`, `⌘⌫`) — слот `trailing` в
				обёртке у конца строки. Пустая обёртка места не занимает.
			-->
			<template #trailing>
				<span class="so-menu-item__shortcut"><slot name="trailing" /></span>
			</template>
		</Button>
	</component>
</template>
