// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import { libConfig } from '../../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка поведения общего слоя тем — экспорта `./setup`: плагины
 * раскладки, данные которых читает CSS тем. CSS базы не собирается вовсе:
 * его отдаёт исходник (`exports["."]` — `src/index.css`), и тема вшивает его
 * своим сборщиком.
 *
 * Выход — `dist/setup`, как у поведения темы: каталог сборки чистится
 * (`emptyOutDir`), и выход в своём подкаталоге не задевает ничего рядом.
 *
 * Декларации собирает `tsc -p tsconfig.build.json` вторым шагом скрипта
 * `build`.
 */
export default libConfig({
	name: '@soldy-ui/theme-base',
	root: import.meta.dirname,
	entry: 'setup/index.ts',
	outDir: 'dist/setup',
})
