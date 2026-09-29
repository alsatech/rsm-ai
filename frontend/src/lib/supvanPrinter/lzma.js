import { compress } from 'lzma1'

// El firmware del T50M espera LZMA1 "alone" con lc=3/lp=0/pb=2 (props byte 0x5D) y
// dict_size=8192 declarado en el header. La librería `lzma1` ya usa lc3/lp0/pb2 fijos
// (confirmado leyendo su fuente: encoder.ts hardcodea esos 3 valores), así que el único
// ajuste necesario es forzar el dict_size declarado — el tamaño real que usa el encoder
// internamente no importa para la compatibilidad del contenido porque los buffers que se
// comprimen aquí son siempre más chicos que cualquier dict_size que la librería pudiera usar
// (confirmado con una prueba manual: parchar el dict_size no rompe el roundtrip).
const DICT_SIZE_ESPERADO_LE = [0x00, 0x20, 0x00, 0x00] // 8192 en little-endian

export function comprimirParaImpresora(bytes) {
  const comprimido = compress(bytes, 1) // modo 1 = más rápido, buffers pequeños no se benefician de más esfuerzo
  const salida = new Uint8Array(comprimido)
  salida[1] = DICT_SIZE_ESPERADO_LE[0]
  salida[2] = DICT_SIZE_ESPERADO_LE[1]
  salida[3] = DICT_SIZE_ESPERADO_LE[2]
  salida[4] = DICT_SIZE_ESPERADO_LE[3]
  return salida
}
