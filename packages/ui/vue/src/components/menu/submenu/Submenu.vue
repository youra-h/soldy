<script lang="ts">
import { Button } from '../../button'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { MenuGroup } from '../group'
import { MenuItem } from '../item'
import { MenuSeparator } from '../separator'
import SetupMenuSubmenu from './setup.component'

/**
 * Пункт с подменю: строка пункта в меню над ним и своя панель с пунктами.
 *
 * Вокруг слота значка нет пробелов: пустую обёртку тема прячет по `:empty`,
 * и пробельный текст сделал бы её непустой.
 */
export default {
	...SetupMenuSubmenu,
	components: { Button, Frame, Icon, MenuGroup, MenuItem, MenuSeparator },
}
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
			Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
			`data-open`) и модификаторы размера меню и своего варианта, а строка
			красится от него, как у пункта: открытый пункт горит, пока открыта
			его панель. Корень — якорь панели: его прямоугольник — строка.
		-->

		<!--
			Строка — `Button` на `div`, как у пункта: на ней ARIA пункта (роль
			`menuitem`, `aria-haspopup="menu"`, `aria-expanded`, `id` и
			`aria-controls` на панель, `tabindex="-1"` от меню) и DOM-фокус,
			когда пункт подсвечен.

			Нажатие строки открывает подменю, а не переключает: открытое
			наведением клик не закроет. Решает меню
			(`adapters.menu.open()`): выключенному отказывает. Стрелку к концу
			строки, Enter и пробел клавиатура пункта гасит сама и открывает
			подменю на первом пункте — клика из них нет.
		-->
		<Button
			embedded="menu.row"
			tag="div"
			:size="size"
			:disabled="disabled"
			@click="context?.adapters.menu.open()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<span class="so-menu-item__icon"><slot name="leading" /></span>
			</template>

			<slot name="header" :text="text" :open="open">{{ text }}</slot>

			<!--
				Стрелка — у конца строки, в обёртке, которая держит её место и
				зеркалит её в RTL. Обёртка скрыта от скринридера: подменю
				объявляет `aria-haspopup`.
			-->
			<template #trailing>
				<span class="so-menu-item__arrow" aria-hidden="true">
					<slot name="arrow-icon">
						<Icon embedded="menu.arrow" :tag="arrowIconTag" :size="size" />
					</slot>
				</span>
			</template>
		</Button>

		<!--
			Панель — Frame, как у меню: телепорт, слой выше панели меню над ним
			(нажатие в ней меню мимо не считает), привязка к корню пункта и
			пометка владельцем. Встаёт у конца строки, верхом вровень с ней, без
			зазора; у края окна привязка переводит её к началу строки, в RTL —
			наоборот. На неё ложится набор панели (`panelAria`): `role="menu"`,
			`id`, на который ссылается `aria-controls` строки, и
			`aria-labelledby` на строку — имя подменю. `tabindex="-1"` — фокус
			встаёт на саму панель, пока ни один пункт не подсвечен.

			Открытость — `visible` панели, а не `rendered`: пункты входят в
			коллекцию подменю при монтировании, и закрытие не должно её
			вычищать. Классы — свой набор (`panelClasses`): блок панели меню с
			размером и вариантом подменю.
		-->
		<Frame
			embedded="menu.submenu-frame"
			:class="panelClasses"
			tabindex="-1"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			anchor_placement="end-start"
			v-bind="{ ...panelAria, ...dismiss_ownerAttribute }"
		>
			<!--
				Список — то, что прокручивается, как у меню. Пункты из `items` —
				только действия, по секциям показанного: группа с подписью — в
				`MenuGroup`, пункты без группы — прямо в списке, между соседними
				секциями — разделитель. Слоты пункта пробрасываются целиком:
				`item-<слот>`, scope — scope слота пункта плюс сам пункт.
			-->
			<div class="so-menu__list">
				<slot>
					<template v-for="(section, index) in sections" :key="section.key">
						<MenuSeparator v-if="index > 0" />
						<MenuGroup v-if="section.group" :label="section.group.label">
							<MenuItem v-for="item in section.items" :key="item.uid" :ctrl="item">
								<template #leading>
									<slot name="item-leading" :item="item" />
								</template>
								<template #default="{ text }">
									<slot name="item" :item="item" :text="text" />
								</template>
								<template #trailing>
									<slot name="item-trailing" :item="item" />
								</template>
							</MenuItem>
						</MenuGroup>
						<template v-else>
							<MenuItem v-for="item in section.items" :key="item.uid" :ctrl="item">
								<template #leading>
									<slot name="item-leading" :item="item" />
								</template>
								<template #default="{ text }">
									<slot name="item" :item="item" :text="text" />
								</template>
								<template #trailing>
									<slot name="item-trailing" :item="item" />
								</template>
							</MenuItem>
						</template>
					</template>
				</slot>
			</div>
		</Frame>
	</component>
</template>
