import { useEffect, useState } from 'react'

import { createMovimiento } from '../../../api/inventario'
import { getUsuarios, getVehiculos } from '../../../api/flota'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { UNIDAD_LABELS, esProductoCombustible } from '../constants'
import Paso1Producto from './Paso1Producto'
import Paso2Detalle from './Paso2Detalle'
import Paso3Confirmar from './Paso3Confirmar'

const PASOS = [
  { num: 1, titulo: '¿Qué es?' },
  { num: 2, titulo: '¿Cuánto y para qué?' },
  { num: 3, titulo: 'Confirmar' },
]

const ROLES_REGISTRAN_ENTRADA = ['inventario', 'administrador', 'superadmin']

function estadoInicial(producto) {
  return {
    producto: producto?.id ?? null,
    tipo: 'salida',
    cantidad: '',
    responsable: '',
    uso_descripcion: '',
    vehiculo: null,           // ID del vehiculo de flota (obligatorio en salidas de combustibles)
    vehiculo_codigo: '',      // legacy: el backend lo autollena desde vehiculo
    proyecto_referencia: '',
    notas: '',
    monto_compra: '',         // si se llena en una entrada, el backend crea una Compra ligada
    comprado_por: '',
  }
}

export default function WizardMovimiento({ productoPreseleccionado, onVolver, onGuardado }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [paso, setPaso] = useState(1)
  const [productoSeleccionado, setProductoSeleccionado] = useState(productoPreseleccionado ?? null)
  const [form, setForm] = useState(() => estadoInicial(productoPreseleccionado))
  const [foto, setFoto] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [vehiculos, setVehiculos] = useState([])
  const [usuarios, setUsuarios] = useState([])

  // Cargamos la lista de vehículos una sola vez al montar — Paso2 y Paso3 la consumen.
  // Excluimos tipos que no usan combustible propio: trailas, plataformas y remolques.
  // (La lista de flota los trae porque también se usan en checklists, pero en salidas
  // de gasolina/diésel no aplica — son elementos que jalan o transportan, no que carguen.)
  useEffect(() => {
    const TIPOS_SIN_COMBUSTIBLE = new Set(['traila', 'plataforma', 'remolque'])
    getVehiculos()
      .then(({ data }) => setVehiculos(data.filter((v) => !TIPOS_SIN_COMBUSTIBLE.has(v.tipo))))
      .catch(() => setVehiculos([]))
    getUsuarios().then(({ data }) => setUsuarios(data)).catch(() => setUsuarios([]))
  }, [])

  const puedeRegistrarEntrada = ROLES_REGISTRAN_ENTRADA.includes(user?.rol)

  const puedeAvanzar1 = Boolean(productoSeleccionado && form.tipo)
  const cantidadValida = Number(form.cantidad) > 0
  const esCombustible = esProductoCombustible(productoSeleccionado)
  // En salidas de combustible el vehiculo es obligatorio; en el resto del flujo no.
  const vehiculoObligatorioOk = !esCombustible || form.tipo !== 'salida' || Boolean(form.vehiculo)
  const esCompra = form.tipo === 'entrada' && Number(form.monto_compra) > 0
  const compraValidaOk = !esCompra || (Boolean(form.comprado_por) && Boolean(foto))
  const puedeAvanzar2 = cantidadValida && vehiculoObligatorioOk && compraValidaOk

  const cantidad = Number(form.cantidad) || 0
  const stockActual = Number(productoSeleccionado?.stock_actual) || 0
  const stockResultante = form.tipo === 'salida' ? stockActual - cantidad : stockActual + cantidad

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('producto', form.producto)
      fd.append('tipo', form.tipo)
      fd.append('cantidad', form.cantidad)
      if (form.responsable) fd.append('responsable', form.responsable)
      if (form.uso_descripcion) fd.append('uso_descripcion', form.uso_descripcion)
      if (form.vehiculo) fd.append('vehiculo', form.vehiculo)
      if (form.proyecto_referencia) fd.append('proyecto_referencia', form.proyecto_referencia)
      if (form.notas) fd.append('notas', form.notas)
      if (foto) fd.append('foto_evidencia', foto)
      if (esCompra) {
        fd.append('monto_compra', form.monto_compra)
        fd.append('comprado_por', form.comprado_por)
      }

      await createMovimiento(fd)

      const unidad = UNIDAD_LABELS[productoSeleccionado?.unidad_medida]
      showToast(
        `✅ ${form.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada — Stock actual: ${stockResultante} ${unidad}`,
        'exito',
      )
      onGuardado?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0]?.[0] || 'No se pudo registrar el movimiento.'
      showToast(mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary hover:border-accent hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="font-bold text-highlight">Nuevo movimiento</h1>
            <p className="text-xs text-text-secondary">Paso {paso} de 3 — {PASOS[paso - 1].titulo}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5">
          {PASOS.map((p) => (
            <div key={p.num} className={`h-1.5 flex-1 rounded-full ${paso >= p.num ? 'bg-highlight' : 'bg-border'}`} />
          ))}
        </div>
      </header>

      <div className="px-4 py-5">
        {paso === 1 && (
          <Paso1Producto
            form={form}
            setForm={setForm}
            productoSeleccionado={productoSeleccionado}
            setProductoSeleccionado={setProductoSeleccionado}
            puedeRegistrarEntrada={puedeRegistrarEntrada}
          />
        )}
        {paso === 2 && (
          <Paso2Detalle
            form={form}
            setForm={setForm}
            productoSeleccionado={productoSeleccionado}
            foto={foto}
            setFoto={setFoto}
            vehiculos={vehiculos}
            usuarios={usuarios}
          />
        )}
        {paso === 3 && (
          <Paso3Confirmar
            form={form}
            productoSeleccionado={productoSeleccionado}
            stockResultante={stockResultante}
            guardando={guardando}
            onGuardar={handleGuardar}
            vehiculos={vehiculos}
            usuarios={usuarios}
          />
        )}

        {paso < 3 && (
          <div className="mt-6 flex gap-3">
            {paso > 1 && (
              <button
                type="button"
                onClick={() => setPaso((p) => p - 1)}
                style={{ minHeight: '56px' }}
                className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
              >
                ← Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaso((p) => p + 1)}
              disabled={(paso === 1 && !puedeAvanzar1) || (paso === 2 && !puedeAvanzar2)}
              style={{ minHeight: '56px' }}
              className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
