// Impresión experimental por Bluetooth a la impresora de etiquetas Katasymbol T50M.
//
// Protocolo reconstruido por ingeniería inversa, referencia: heeen/supvan-cups (MIT),
// https://github.com/heeen/supvan-cups/blob/master/docs/PROTOCOL.md — usado con
// autorización explícita del dueño del proyecto para portar la lógica a JavaScript.
//
// LIMITACIONES CONOCIDAS:
// - Solo funciona en navegadores con Web Bluetooth: Chrome/Edge de escritorio y Chrome de
//   Android. NO funciona en Safari/iOS ni Firefox — ahí solo queda la descarga de la
//   etiqueta como imagen (ver EtiquetaProducto.jsx) para imprimir desde la app de Katasymbol.
// - No se ha podido probar contra un T50M real en este entorno de desarrollo. La primera
//   prueba de campo puede revelar ajustes necesarios (especialmente: el sub-protocolo exacto
//   de subida de datos crudos en BUF_FULL, y los offsets de RETURN_MAT por BLE).
// - El tamaño de etiqueta usado es fijo (30mm de largo, ver constants.js) porque no se
//   confirmaron los offsets de RETURN_MAT para BLE — ajustar ahí si el rollo real es de otra
//   medida.
export { imprimirEtiquetaT50M, imprimirVariasEtiquetasT50M } from './printer.js'
export { soportaImpresionBluetooth } from './transport.js'
