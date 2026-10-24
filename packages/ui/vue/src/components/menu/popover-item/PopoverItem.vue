<script lang="ts">
import { Button } from '../../button'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import SetupMenuPopoverItem from './setup.component'

/**
 * Пункт с панелью: строка пункта в меню и своя панель сбоку с любым
 * содержимым — календарём, полями, палитрой.
 *
 * Вокруг слота значка нет пробелов: пустую обёртку тема прячет по `:empty`,
 * и пробельный текст сделал бы её непустой.
 */
export default { ...SetupMenuPopoverItem, components: { Button, Frame, Icon } }
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
			Пункт с панелью (`Menu.PopoverItem`): строка открывает сбоку свою
			панель, а в панели — что угодно, хоть календарь. Корень — блок
			пункта, общий с действием и флажком: на нём модификаторы размера меню
			и своего варианта и состояние для темы — `data-highlighted`,
			`data-disabled` и `data-open` (панель открыта). Строка красится от
			него, носитель `dataset` один.

			Панель телепортирована, поэтому прямоугольник корня — прямоугольник
			строки, и корень служит панели якорем.
		-->

		<!--
			Строка — `Button` над экземпляром пункта (`row`, `TItemRow` на
			`div`), как у пункта (`menu.row`): на ней ARIA пункта — роль
			`menuitem`, `aria-haspopup="dialog"`, `aria-expanded`, `id` и
			`aria-controls` на панель, `tabindex="-1"` от меню — и DOM-фокус,
			когда пункт подсвечен. Размер и `disabled` ей пишет пункт.

			Нажатие строки открывает панель, а не выполняет действие: меню
			остаётся открытым, а открытую панель повторное нажатие не закрывает.
			Решает меню (`adapters.menu.open()`): выключенному отказывает. Enter
			и пробел на строке превращает в клик сама строка (`TActionPlugin`),
			стрелку к концу строки клавиатура пункта гасит и открывает панель
			сама — клика из неё нет.
		-->
		<Button
			embedded="menu.row"
			:ctrl="row"
			@click="context?.adapters.menu.open()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<!--
				Значок — слот `leading` в обёртке колонки, как у пункта: пустая
				места не занимает, а если значок есть хоть у одного пункта меню,
				держит его колонку.
			-->
			<template #leading>
				<span class="so-menu-item__icon"><slot name="leading" /></span>
			</template>

			<!--
				Текст строки — слот `header`, а не `default`: `default` — содержимое
				панели, как у `Accordion.Item` и `Popover`. Scope — `text` и `open`,
				без слота — текст пункта (`text`).
			-->
			<slot name="header" :text="text" :open="open">{{ text }}</slot>

			<!--
				Стрелка — у конца строки: у пункта есть панель, и встаёт она сбоку.
				Подсказки сочетания у этого пункта нет. Класс — на обёртке, а не
				на иконке: тема зеркалит стрелку в RTL по `.so-menu-item__arrow`,
				и иконка, подменённая слотом `arrow-icon`, зеркалится так же.
				Обёртка скрыта от скринридера: о панели говорит ARIA строки.
				Иконка по умолчанию — роль `arrowRight`.
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
			Панель — Frame после строки: телепорт в `body`, соседка панели меню, а
			не её потомок, слой поверх неё (нажатие и фокус в ней меню мимо не
			считает), привязка к корню пункта и пометка владельцем. Встаёт у
			самого конца строки, верхом вровень с ней, без зазора (`end-start`):
			на поле списка меню панель заходит слоем поверх; у края окна привязка
			переводит её к началу строки, в RTL — наоборот. На панель ложится её
			набор ARIA (`panelAria`): `role="dialog"`, `id`, на который ссылается
			`aria-controls` строки, и `aria-labelledby` на строку — имя панели.
			`tabindex="-1"` — фокус встаёт на саму панель, когда внутри нечего
			фокусировать.

			Открытость — `visible` панели, а не `rendered`: закрытие её прячет, а
			не размонтирует. Проявление и исчезание тема читает с `data-open`,
			который Frame пишет сам. Крестика и полосы жеста нет: панель
			закрывают Escape, нажатие мимо и другой пункт.
		-->
		<Frame
			embedded="menu.popover-item-frame"
			class="so-menu-item__panel"
			tabindex="-1"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			anchor_placement="end-start"
			v-bind="{ ...panelAria, ...dismiss_ownerAttribute }"
		>
			<!--
				Содержимое — то, что прокручивается: поля панели внутри
				прокрутки, кольцо фокуса у края не обрезается. `lazyMount`
				действует только на слот: обёртка остаётся, панель не
				размонтируется никогда.
			-->
			<div class="so-menu-item__content">
				<slot v-if="contentRendered" />
			</div>
		</Frame>
	</component>
</template>
