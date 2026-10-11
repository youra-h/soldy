// @soldy-ui/webc

// Первым: элементы soldy расширяют встроенные (`<button is="so-button">`), а
// Safari этого не умеет — полифил должен встать раньше, чем модули компонентов
// зарегистрируют элементы. Там, где браузер умеет сам, он ничего не делает
import '@ungap/custom-elements'

export * from './adapter'
export * from './components'
