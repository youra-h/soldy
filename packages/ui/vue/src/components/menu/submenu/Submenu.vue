<script lang="ts">
import { ItemRow } from '../../item-row'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { MenuGroup } from '../group'
import { MenuItem } from '../item'
import { MenuSeparator } from '../separator'
import Submenu from './Submenu.vue'
import SetupMenuSubmenu from './setup.component'

const components = { Frame, Icon, ItemRow, MenuGroup, MenuItem, MenuSeparator }

/**
 * Подменю из данных в подменю — третий уровень и ниже — рисует оно само:
 * `<Submenu>` в разметке — этот компонент, импортом своего модуля.
 *
 * - Регистрация, а не одно имя файла: по имени файла Vue находит компонент
 *   после глобальных компонентов приложения, и чужой `Submenu` подменил бы
 *   уровень.
 * - Геттер: ссылку на себя читает отрисовка, а пока модуль исполняется, его
 *   экспорта ещё нет.
 * - Свойство встаёт после объекта, а не в нём: тип разметки vue-tsc берёт у
 *   `components`, и ссылка на себя замкнула бы тип компонента на себя. Тип
 *   `<Submenu>` vue-tsc выводит сам — по имени файла, это он и есть.
 */
Object.defineProperty(components, 'Submenu', { enumerable: true, get: () => Submenu })

/**
 * Пункт с подменю: строка пункта в меню над ним и своя панель с пунктами.
 *
 * Вокруг слота значка нет пробелов: пустую обёртку тема прячет по `:empty`,
 * и пробельный текст сделал бы её непустой.
 */
export default { ...SetupMenuSubmenu, components }
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
			Строка — `ItemRow` на `div`, как у пункта: на ней ARIA пункта (роль
			`menuitem`, `aria-haspopup="menu"`, `aria-expanded`, `id` и
			`aria-controls` на панель, `tabindex="-1"` от меню) и DOM-фокус,
			когда пункт подсвечен.

			Нажатие строки открывает подменю, а не переключает: открытое
			наведением клик не закроет. Решает меню
			(`adapters.menu.open()`): выключенному отказывает. Стрелку к концу
			строки, Enter и пробел клавиатура пункта гасит сама и открывает
			подменю на первом пункте — клика из них нет.
		-->
		<ItemRow
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
		</ItemRow>

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
			размером подменю и вариантом его панели — своим вариантом подменю,
			а без него вариантом меню над ним.
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
				действия и подменю, по секциям показанного: группа с подписью — в
				`MenuGroup`, пункты без группы — прямо в списке, между соседними
				секциями, пока его просит подменю (`groupSeparators`), —
				разделитель. Пункт с вложенным `items` — подменю следующего
				уровня, как у меню: его запись (`submenus`) ложится в пропсы
				`Submenu` — этого же компонента. Слоты пункта пробрасываются
				целиком: `item-<слот>`, scope — scope слота строки плюс сам
				пункт; `default` подменю — `item-content`, а свои `item` и
				`item-*` подменю отдаёт следующему уровню под теми же именами.
			-->
			<div class="so-menu__list">
				<slot>
					<template v-for="(section, index) in sections" :key="section.key">
						<MenuSeparator v-if="groupSeparators && index > 0" />
						<MenuGroup v-if="section.group" :label="section.group.label">
							<template v-for="item in section.items" :key="item.uid">
								<Submenu v-if="submenus.has(item)" v-bind="submenus.get(item)">
									<template #leading>
										<slot name="item-leading" :item="item" />
									</template>
									<template #header="{ text, open }">
										<slot
											name="item-header"
											:item="item"
											:text="text"
											:open="open"
										/>
									</template>
									<template #arrow-icon>
										<slot name="item-arrow-icon" :item="item" />
									</template>
									<template #default>
										<slot name="item-content" :item="item" />
									</template>
									<template #item="{ item: child, text }">
										<slot name="item" :item="child" :text="text" />
									</template>
									<template #item-leading="{ item: child }">
										<slot name="item-leading" :item="child" />
									</template>
									<template #item-trailing="{ item: child }">
										<slot name="item-trailing" :item="child" />
									</template>
									<template #item-header="{ item: child, text, open }">
										<slot
											name="item-header"
											:item="child"
											:text="text"
											:open="open"
										/>
									</template>
									<template #item-arrow-icon="{ item: child }">
										<slot name="item-arrow-icon" :item="child" />
									</template>
									<template #item-content="{ item: child }">
										<slot name="item-content" :item="child" />
									</template>
								</Submenu>
								<MenuItem v-else :ctrl="item">
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
						</MenuGroup>
						<template v-else>
							<template v-for="item in section.items" :key="item.uid">
								<Submenu v-if="submenus.has(item)" v-bind="submenus.get(item)">
									<template #leading>
										<slot name="item-leading" :item="item" />
									</template>
									<template #header="{ text, open }">
										<slot
											name="item-header"
											:item="item"
											:text="text"
											:open="open"
										/>
									</template>
									<template #arrow-icon>
										<slot name="item-arrow-icon" :item="item" />
									</template>
									<template #default>
										<slot name="item-content" :item="item" />
									</template>
									<template #item="{ item: child, text }">
										<slot name="item" :item="child" :text="text" />
									</template>
									<template #item-leading="{ item: child }">
										<slot name="item-leading" :item="child" />
									</template>
									<template #item-trailing="{ item: child }">
										<slot name="item-trailing" :item="child" />
									</template>
									<template #item-header="{ item: child, text, open }">
										<slot
											name="item-header"
											:item="child"
											:text="text"
											:open="open"
										/>
									</template>
									<template #item-arrow-icon="{ item: child }">
										<slot name="item-arrow-icon" :item="child" />
									</template>
									<template #item-content="{ item: child }">
										<slot name="item-content" :item="child" />
									</template>
								</Submenu>
								<MenuItem v-else :ctrl="item">
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
					</template>
				</slot>
			</div>
		</Frame>
	</component>
</template>
