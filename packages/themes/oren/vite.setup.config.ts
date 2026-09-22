// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import { libConfig } from '../../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка поведения темы — экспорта `./setup`: плагины, данные
 * которых читает CSS oren. CSS собирает соседний `vite.config.ts`, у него свой
 * вход и свой препроцессор.
 *
 * Выход отдельный (`dist/setup`), потому что выходов у пакета два, а каталог
 * сборки чистится: CSS идёт первым и забирает себе весь `dist`.
 *
 * Декларации собирает `tsc -p tsconfig.build.json` третьим шагом скрипта
 * `build`.
 */
export default libConfig({
	name: '@soldy-ui/theme-oren',
	root: import.meta.dirname,
	entry: 'setup/index.ts',
	outDir: 'dist/setup',
})
