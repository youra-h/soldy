---
'@soldy-ui/webc': patch
---

Web Components: the polyfill of customized built-ins (Safari) runs before the first element is defined, from the package root and from every entry — in 0.3.0-alpha.5 the built package ran it after every registration.
