/**
 * JS-вход для сборки темы.
 *
 * Vite 8 (rolldown) падает в vite:css-post, если lib.entry указывает прямо на
 * .scss, поэтому вход — этот модуль, а стили подтягиваются импортом.
 * Результат сборки всё тот же dist/index.css.
 */
import './index.scss'
