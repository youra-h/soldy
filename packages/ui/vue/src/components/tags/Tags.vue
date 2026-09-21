<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import { Popover } from '../popover'
import { TagsItem } from './item'
import SetupTags from './setup.component'

export default { ...SetupTags, components: { Button, Icon, Popover, TagsItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			`dataset` — рядом с `aria`: режим переполнения уезжает в тему через
			`data-overflow`, и раскладка ряда (перенос, прокрутка, одна строка)
			целиком её дело.
		-->
		<slot>
			<!--
				Слоты элементов статические и получают элемент через scope —
				динамические имена резолвит только Vue (см. ListBox/Tabs).

				`fitted`, а не `shown`: это показанное за вычетом того, что не
				поместилось в строку. Вне режима `popover` делить нечего, и
				`fitted` равен всему показанному. Скрытый отбором элемент
				размонтируется, но из коллекции не исчезает — составом владеют
				данные, а не разметка (см. `owned` в `TCollectionExtension`).

				Панель — в том же запасном содержимом, что и ряд: каждый тег
				отрисован ровно один раз, а состав ряда, объявленный
				потребителем, принадлежит ему — делить его нам не по чему.
			-->
			<TagsItem v-for="item in fitted" :key="item.uid" :ctrl="item">
				<template #leading>
					<slot name="item-leading" :item="item" />
				</template>
				<template #default>
					<slot name="item" :item="item" />
				</template>
				<template #trailing>
					<slot name="item-trailing" :item="item" />
				</template>
			</TagsItem>

			<!--
				Панель с непоместившимися тегами. Инстанс приходит готовым из
				коллекции: его создаёт расширение `overflow`, оно же закрывает
				панель, когда из неё закрыли последний тег. Разметка ничего не
				вычисляет — ни открытости, ни состава.

				Кнопки нет, пока хвоста нет: помещаются все теги — и места под
				неё в ряду не занято (замер считает так же).

				Место в ряду — номером, как у тега (`order` у Item.vue): ряд —
				флексбокс, и порядок в нём задаёт коллекция, а не разметка.
				Считает номер она же (`moreOrder` — место первого тега, который
				не поместился); без него кнопка встаёт нулевой и оказывается
				сразу за первым тегом.

				Имя панели — то же, что у кнопки: диалог без имени скринридер
				объявит безымянным.
			-->
			<Popover
				v-if="panel && overflowed.length > 0"
				embedded="tags.more"
				class="s-tags__overflow"
				:style="{ order: moreOrder }"
				:ctrl="panel"
				:aria_label="moreLabel"
			>
				<template #trigger="{ triggerAria, triggerDataset }">
					<!--
						Кнопка «…». Вида у неё нет: значения вида объявляет тема, и
						красит она кнопку по контексту (`.s-tags__more`). Значок —
						иконка роли `moreHoriz` из подключённого пакета, как крестик
						тега, а не символ многоточия текстом: кегль у трёх точек свой на
						каждом шрифте, и подменить их в одном месте было нечем.

						Связку с панелью (`aria-haspopup`, `aria-expanded`,
						`aria-controls`) и вид «нажат» кнопка получает из scope слота,
						имя — из `moreAria` ядра.
					-->
					<Button
						embedded="tags.more-trigger"
						class="s-tags__more"
						:size="size"
						:disabled="disabled"
						v-bind="{ ...triggerAria, ...triggerDataset, ...moreAria }"
					>
						<slot name="more-icon">
							<Icon embedded="tags.more-icon" :tag="moreIconTag" :size="size" />
						</slot>
					</Button>
				</template>

				<!--
					Теги панели — те же `TagsItem` с теми же слотами. Классы и роль
					панели считает ядро: теги в ней телепортированы, потомками корня
					не являются, и селекторы вида до них не достают.
				-->
				<div :class="panelClasses" v-bind="panelAria">
					<TagsItem v-for="item in overflowed" :key="item.uid" :ctrl="item">
						<template #leading>
							<slot name="item-leading" :item="item" />
						</template>
						<template #default>
							<slot name="item" :item="item" />
						</template>
						<template #trailing>
							<slot name="item-trailing" :item="item" />
						</template>
					</TagsItem>
				</div>
			</Popover>
		</slot>
	</div>
</template>
