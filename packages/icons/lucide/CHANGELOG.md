# @soldy-ui/icons-lucide

## 0.3.0-alpha.3

### Minor Changes

- bb71433: Цвет иконки — лестница приоритетов, одна для обоих пакетов и любого способа рисования: правило темы для места сильнее цвета темы по умолчанию, а тот — цвета, с которым иконка загружена. Пакеты красят рисунок ссылкой на переменную `--so-icon-color` с цветом из SVG запасным значением (атрибутом SVG, а не `style`): без темы иконка Material — `#1f1f1f`, Lucide — цвета текста, а Lucide снова рисует линиями толщиной 1.5, звезда залита. Тема oren задаёт цвет переменной, а не `fill`. Что сломалось: тема больше не заливает `fill: currentColor` свой `<svg>` в слоте кнопки и в коробке значка тоста, а своя иконка роли (`useIcons`) без покраски рисуется умолчанием SVG — чёрной. Чтобы она брала цвет темы, покрасьте её так же: `<g fill="var(--so-icon-color, currentColor)">…</g>` (у иконки линиями — `stroke`).

### Patch Changes

- Updated dependencies [582d3a6]
- Updated dependencies [28470f6]
- Updated dependencies [0471962]
- Updated dependencies [fc30695]
- Updated dependencies [64be9ca]
- Updated dependencies [fcd14b4]
- Updated dependencies [a09886b]
- Updated dependencies [7a86466]
- Updated dependencies [ad1de00]
- Updated dependencies [53a3fe6]
  - @soldy-ui/setup@0.3.0-alpha.3

## 0.3.0-alpha.2

### Patch Changes

- fc19852: Новый пакет иконок @soldy-ui/icons-lucide: роли ICON_ROLES в стиле Lucide (обводка 1.5, переведённая в залитый контур). Подключение — useIcons(lucide) вместо пакета Material.
- @soldy-ui/setup@0.3.0-alpha.2
