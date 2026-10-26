import { useState } from 'react'

import { createProveedor, updateProveedor } from '../../../api/proveedores'
import { useToast } from '../../../hooks/useToast'
import { ESPECIALIDADES_SUGERIDAS, TIPO_PROVEEDOR_CONFIG } from '../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'
const labelClass = 'mb-1 block text-sm font-medium text-text-secondary'

export default function FormularioProveedor({ proveedor, onCancelar, onGuardado }) {
  const { showToast } = useToast()
  const esEdicion = Boolean(proveedor)
  const [tipo, setTipo] = useState(proveedor?.tipo ?? 'material')
  const [persona, setPersona] = useState(proveedor?.persona ?? '')
  const [nombre, setNombre] = useState(proveedor?.nombre ?? '')
  const [empresa, setEmpresa] = useState(proveedor?.empresa ?? '')
  const [especialidad, setEspecialidad] = useState(proveedor?.especialidad ?? '')
  const [rfc, setRfc] = useState(proveedor?.rfc ?? '')
  const [ciudad, setCiudad] = useState(proveedor?.ciudad ?? '')
  const [pais, setPais] = useState(proveedor?.pais ?? 'México')
  const [moneda, setMoneda] = useState(proveedor?.moneda ?? 'MXN')
  const [tipoCambioReferencia, setTipoCambioReferencia] = useState(proveedor?.tipo_cambio_referencia ?? '')
  const [trabajoAntes, setTrabajoAntes] = useState(proveedor?.trabajo_antes ?? false)
  const [detalleTrabajoPrevio, setDetalleTrabajoPrevio] = useState(proveedor?.detalle_trabajo_previo ?? '')
  const [telefono, setTelefono] = useState(proveedor?.telefono ?? '')
  const [email, setEmail] = useState(proveedor?.email ?? '')
  const [banco, setBanco] = useState(proveedor?.banco ?? '')
  const [cuentaBancaria, setCuentaBancaria] = useState(proveedor?.cuenta_bancaria ?? '')
  const [clabe, setClabe] = useState(proveedor?.clabe ?? '')
  const [notas, setNotas] = useState(proveedor?.notas ?? '')
  const [activo, setActivo] = useState(proveedor?.activo ?? true)
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar = nombre.trim().length > 0

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const payload = {
        tipo, persona, nombre, empresa, especialidad, rfc, ciudad, pais, moneda,
        tipo_cambio_referencia: tipoCambioReferencia || null,
        trabajo_antes: trabajoAntes,
        detalle_trabajo_previo: trabajoAntes ? detalleTrabajoPrevio : '',
        telefono, email, banco, cuenta_bancaria: cuentaBancaria, clabe, notas, activo,
      }
      if (esEdicion) {
        await updateProveedor(proveedor.id, payload)
        showToast('✅ Proveedor actualizado', 'exito')
      } else {
        await createProveedor(payload)
        showToast('✅ Proveedor dado de alta', 'exito')
      }
      onGuardado?.()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo guardar el proveedor.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold text-text">
        {esEdicion ? 'Editar proveedor' : 'Dar de alta proveedor'}
      </h2>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="tipo" className={labelClass}>Tipo *</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
            {Object.entries(TIPO_PROVEEDOR_CONFIG).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="nombre" className={labelClass}>Nombre *</label>
          <input
            id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la persona o representante" className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="empresa" className={labelClass}>Empresa / razón social</label>
            <input id="empresa" type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="persona" className={labelClass}>Tipo de persona</label>
            <select id="persona" value={persona} onChange={(e) => setPersona(e.target.value)} className={inputClass}>
              <option value="">Sin especificar</option>
              <option value="fisica">Persona física</option>
              <option value="moral">Persona moral</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="especialidad" className={labelClass}>Especialidad / categoría</label>
          <input
            id="especialidad" type="text" list="especialidades-sugeridas" value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)} placeholder="Ej. Albañilería, Alimento para ganado…"
            className={inputClass}
          />
          <datalist id="especialidades-sugeridas">
            {ESPECIALIDADES_SUGERIDAS.map((e) => <option key={e} value={e} />)}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rfc" className={labelClass}>RFC (opcional)</label>
            <input id="rfc" type="text" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} className={inputClass} />
          </div>
          <div>
            <label htmlFor="ciudad" className={labelClass}>Ciudad</label>
            <input id="ciudad" type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pais" className={labelClass}>País</label>
            <input id="pais" type="text" value={pais} onChange={(e) => setPais(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="moneda" className={labelClass}>Moneda</label>
            <select id="moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputClass}>
              <option value="MXN">Peso mexicano (MXN)</option>
              <option value="USD">Dólar (USD)</option>
              <option value="otra">Otra</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="tipo_cambio" className={labelClass}>Tipo de cambio de referencia (opcional)</label>
          <input
            id="tipo_cambio" type="number" step="0.0001" value={tipoCambioReferencia}
            onChange={(e) => setTipoCambioReferencia(e.target.value)}
            placeholder="Solo como referencia al dar de alta — el real fluctúa"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="telefono" className={labelClass}>Teléfono</label>
            <input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>Correo</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-text">
          <input type="checkbox" checked={trabajoAntes} onChange={(e) => setTrabajoAntes(e.target.checked)} className="h-5 w-5" />
          ¿Ya ha trabajado antes con nosotros en la reserva?
        </label>

        {trabajoAntes && (
          <div>
            <label htmlFor="detalle_trabajo_previo" className={labelClass}>¿En qué trabajó / cuándo?</label>
            <textarea
              id="detalle_trabajo_previo" value={detalleTrabajoPrevio}
              onChange={(e) => setDetalleTrabajoPrevio(e.target.value)} rows={2} className={inputClass}
            />
          </div>
        )}

        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-bold text-text">Datos bancarios (opcional, para pagos)</p>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="banco" className={labelClass}>Banco</label>
              <input id="banco" type="text" value={banco} onChange={(e) => setBanco(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cuenta_bancaria" className={labelClass}>Cuenta</label>
                <input
                  id="cuenta_bancaria" type="text" value={cuentaBancaria}
                  onChange={(e) => setCuentaBancaria(e.target.value)} className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="clabe" className={labelClass}>CLABE</label>
                <input id="clabe" type="text" value={clabe} onChange={(e) => setClabe(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="notas" className={labelClass}>Notas</label>
          <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={inputClass} />
        </div>

        {esEdicion && (
          <label className="flex items-center gap-2 text-sm font-medium text-text">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-5 w-5" />
            Proveedor activo
          </label>
        )}

        <div className="mt-2 flex gap-3">
          <button
            type="button" onClick={onCancelar} style={{ minHeight: '48px' }}
            className="flex-1 rounded-xl border border-border text-sm font-semibold text-text-secondary transition hover:border-accent hover:text-text"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={handleGuardar} disabled={!puedeGuardar || guardando} style={{ minHeight: '48px' }}
            className="flex-1 rounded-xl bg-accent text-sm font-bold text-highlight transition hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : '+ Dar de alta'}
          </button>
        </div>
      </div>
    </div>
  )
}
