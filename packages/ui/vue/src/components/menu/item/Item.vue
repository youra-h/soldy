<template>
	<div class="so-menu-item">
		<!--
			Пункт: действие, флажок или переключатель — строка у них одна.
			Корень несёт состояние для темы (`data-highlighted`,
			`data-selected`, `data-disabled`) и модификаторы размера и своего
			варианта, а строка красится от него.
		-->

		<!--
			Строка — `Button` на `div`, как у ListBox: на ней ARIA пункта (роль
			`menuitem`, `menuitemcheckbox` или `menuitemradio`, `aria-checked`,
			`tabindex` обхода) и DOM-фокус. Размер и `disabled` — пункта. Вида и
			варианта строка не получает: вид ей даёт тема по контексту, а цвет
			она берёт с пункта и панели.
		-->
		<Button>
			<template #leading>
				<!--
					Отметка — только у флажка и переключателя, и у неотмеченных
					тоже: обёртка держит колонку, а её наличие в списке тема
					читает как «у меню есть колонка отметок». Рисунок внутри —
					только у отмеченного: у флажка `Icon` роли `check`, у
					переключателя — точка темы. Обёртка скрыта от скринридера:
					состояние объявляет `aria-checked`.
				-->
				<span class="so-menu-item__indicator">
					<slot name="indicator-icon">
						<Icon />
						<span class="so-menu-item__dot"></span>
					</slot>
				</span>

				<!--
					Значок — слот `leading` в обёртке колонки. Обёртка есть у
					каждого пункта: пустая места не занимает, а если значок есть
					хоть у одного пункта меню — держит его колонку.
				-->
				<span class="so-menu-item__icon">
					<slot name="leading" />
				</span>
			</template>

			<!-- Текст пункта; запасное — `text` -->
			<slot />

			<template #trailing>
				<!--
					Подсказка сочетания клавиш (`Ctrl+S`, `⌘⌫`) — слот `trailing`
					в обёртке у конца строки. Пустая обёртка места не занимает.
				-->
				<span class="so-menu-item__shortcut">
					<slot name="trailing" />
				</span>
			</template>
		</Button>
	</div>
</template>
