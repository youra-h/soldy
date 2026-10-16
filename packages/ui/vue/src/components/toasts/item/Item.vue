<template>
	<li class="so-toasts-item">
		<!--
			Корень — место тоста в списке: высота места, сдвиг жеста, уход и
			прозрачность (тема). Код выпустит на нём: вариант — модификатор
			`so-toasts-item--variant-*` (нет варианта — нейтральный),
			`data-open` (с первой отрисовки; `false` — тост закрыт и гаснет),
			`data-swiping` (тянут), роль `status` или `alert` для срочного,
			`tabindex` — фокус по F8 и Escape на тосте под фокусом. Сдвиг во
			время жеста (`--so-swipe-offset`) плагин жеста пишет сюда сам.
		-->

		<!--
			Плашка — то, что видно: поверхность, кромка, тень и кольцо фокуса
			корня. Отдельный узел, а не корень: место растёт и схлопывается
			переходом высоты без замеров, а плашка своего размера не меняет.
		-->
		<div class="so-toasts-item__card">
			<!--
				Значок — слот `icon`; без слота узла нет. Декор: имя тосту даёт
				текст, поэтому код спрячет узел от скринридера (`aria-hidden`).
			-->
			<span class="so-toasts-item__icon"><slot name="icon" /></span>

			<!--
				Текст: заголовок (слот `default`, запасное — `text` тоста),
				описание (слот `description`, запасное — `description`) и своё
				содержимое (слот `content`, запасное — `render` тоста: кнопка
				«Отменить» и подобное, она получает тост и может его закрыть).
				Вокруг слотов нет пробелов: пустую часть тема сворачивает по
				`:empty`.
			-->
			<div class="so-toasts-item__body">
				<div class="so-toasts-item__text"><slot /></div>
				<div class="so-toasts-item__description"><slot name="description" /></div>
				<div class="so-toasts-item__content"><slot name="content" /></div>
			</div>

			<!--
				Крестик — последним в DOM: последняя остановка Tab в тосте.
				Прячется `rendered` (`closable`). Имя — из локали, как у крестика
				окна (`closeAria`). Вида и размера у него нет: квадрат и вид
				`plain` даёт тема по контексту. Иконка — роль `close`.
			-->
			<Button class="so-toasts-item__close">
				<slot name="close-icon">
					<Icon />
				</slot>
			</Button>
		</div>
	</li>
</template>
