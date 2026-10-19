<script lang="ts">
import { Frame } from '../frame'
import { MenuGroup } from './group'
import { MenuItem } from './item'
import { MenuSeparator } from './separator'
import SetupMenu from './setup.component'

export default { ...SetupMenu, components: { Frame, MenuGroup, MenuItem, MenuSeparator } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset }"
	>
		<!--
			Корень — обёртка триггера и якорь панели, как у Popover. Рисуется по
			`tag`, по умолчанию `span`: меню встаёт и в строку текста, и в ряд
			кнопок. Панель телепортирована, поэтому в корне лежит только триггер,
			и прямоугольник корня — прямоугольник триггера.

			`data-open` — на корне, для потребителя, который красит свой триггер
			по контексту. Тема меню его не читает: «нажат» открытый триггер и
			так, по `data-selected` из `triggerDataset`. ARIA на корне нет: она у
			панели и у триггера.
		-->

		<!--
			Триггер — кнопка потребителя («…», «Действия»). Лежит внутри корня:
			нажатие по открытому триггеру — нажатие внутри владельца, и панель
			не мигает. Своего экземпляра у содержимого слота нет, поэтому
			сторону связки (`aria-haspopup`, `aria-expanded`, `id`,
			`aria-controls`) и вид «нажата» (`data-selected`) он получает через
			scope — двумя наборами, ARIA и `data-*` врозь. Стрелку у кнопки
			рисует потребитель. У контекстного меню (`openOn: 'contextmenu'`)
			здесь область — строка, файл, картинка, — и связка у неё пуста.
		-->
		<slot name="trigger" :triggerAria="triggerAria" :triggerDataset="triggerDataset" />

		<!--
			Панель — Frame: телепорт, слой, привязка к корню (`TAnchorPlugin`,
			отступ 4px, как у Select) и пометка владельцем для закрытия по
			нажатию мимо. На неё ложится `aria` меню: `role="menu"`, `id`, на
			который ссылается `aria-controls` триггера, и `aria-labelledby` на
			триггер — имя меню. `tabindex="-1"` — фокус встаёт на саму панель,
			пока ни один пункт не подсвечен.

			У контекстного меню панель встаёт у точки вызова (`point`): точка
			главнее корня, пока задана, и выбирает между ними якорь, а не
			шаблон. Корень остаётся якорем на случай, когда точки нет.

			Открытость — `visible` панели, а не `rendered`: пункты входят в
			коллекцию при монтировании, и закрытие не должно её вычищать.
			Проявление и исчезание тема читает с `data-open`, который Frame
			пишет сам.

			Классы панели — свой набор меню (`panelClasses`): блок
			`so-menu__panel` с размером и вариантом меню. Модификаторы корня до
			телепортированной панели не доходят, а размер подписей групп и цвет
			пунктов без своего варианта тема берёт с неё.
		-->
		<Frame
			embedded="menu.frame"
			:class="panelClasses"
			tabindex="-1"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			:anchor_point="point"
			:anchor_placement="placement"
			:anchor_offset="4"
			v-bind="{ ...aria, ...dismiss_ownerAttribute }"
		>
			<!--
				Список — то, что прокручивается: поле внутри прокрутки, и
				подсвеченная строка не прижата к кромке. Роль `menu` — у панели,
				а не здесь: фокус без подсветки держит панель, и узел с ролью и
				фокусом должен быть один.
			-->
			<div class="so-menu__list">
				<slot>
					<!--
						Пункты из `items` — только действия: флажки ставят
						разметкой. Петля — по секциям показанных пунктов
						(`sections`), ключ — ключ секции: группа с подписью — в
						`MenuGroup`, пункты без группы — прямо в списке, между
						соседними секциями — разделитель. Секции идут порядком
						показанного, поэтому стрелки ходят так же, как пункты стоят
						на экране. Без групп секция одна — ни обёртки, ни
						разделителя.

						Пункт — по `uid`. Слоты пункта пробрасываются целиком: у
						каждого есть `item-<слот>`, scope — scope слота пункта плюс
						сам пункт (`item`). Проброс записан у пунктов группы и у
						пунктов без неё: обёртка у них разная.
					-->
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
