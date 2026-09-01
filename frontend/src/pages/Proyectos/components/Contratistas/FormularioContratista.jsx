import { useState } from 'react'

import { createContratista, updateContratista } from '../../../../api/proyectos'
import { useToast } from '../../../../hooks/useToast'
import { ESPECIALIDADES_SUGERIDAS } from '../../constants'

const inputClass =
  'w-full rounded-lg border border-border bg-bg px-4 py-3 text-base text-text outline-none focus:border-highlight'

export default function FormularioContratista({ contratista, onCancelar, onGuardado }) {
  const { showToast } = useToast()
  const esEdicion = Boolean(contratista)
  const [nombre, setNombre] = useState(contratista?.nombre ?? '')
  const [empresa, setEmpresa] = useState(contratista?.empresa ?? '')
  const [especialidad, setEspecialidad] = useState(contratista?.especialidad ?? '')
  const [telefono, setTelefono] = useState(contratista?.telefono ?? '')
  const [email, setEmail] = useState(contratista?.email ?? '')
  const [rfc, setRfc] = useState(contratista?.rfc ?? '')
  const [notas, setNotas] = useState(contratista?.notas ?? '')
  const [guardando, setGuardando] = useState(false)

  const puedeGuardar = Boolean(nombre.trim() && especialidad.trim())

  const handleGuardar = async () => {
    setGuardando(true)
    const payload = { nombre, empresa, especialidad, telefono, email, rfc, notas }
    try {
      if (esEdicion) {
        await updateContratista(contratista.id, payload)
        showToast('✅ Contratista actualizado', 'exito')
      } else {
        await createContratista(payload)
        showToast('✅ Contratista dado de alta', 'exito')
      }
      onGuardado()
    } catch (err) {
      const mensaje = Object.values(err?.response?.data ?? {})[0] || 'No se pudo guardar el contratista.'
      showToast(Array.isArray(mensaje) ? mensaje[0] : mensaje, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-4 text-xl font-bold text-text">{esEdicion ? 'Editar contratista' : 'Nuevo contratista'}</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="nombre_contratista" className="mb-1 block text-sm font-medium text-text-secondary">
            Nombre *
          </label>
          <input id="nombre_contratista" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="empresa_contratista" className="mb-1 block text-sm font-medium text-text-secondary">
            Empresa (opcional)
          </label>
          <input id="empresa_contratista" type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="especialidad_contratista" className="mb-1 block text-sm font-medium text-text-secondary">
            Especialidad *
          </label>
          <input
            id="especialidad_contratista"
            type="text"
            list="especialidades-sugeridas-catalogo"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            className={inputClass}
          />
          <datalist id="especialidades-sugeridas-catalogo">
            {ESPECIALIDADES_SUGERIDAS.map((e) => <option key={e} value={e} />)}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="telefono_contratista" className="mb-1 block text-sm font-medium text-text-secondary">
              Teléfono
            </label>
            <input id="telefono_contratista" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="rfc_contratista" className="mb-1 block text-sm font-medium text-text-secondary">
              RFC
            </label>
            <input id="rfc_contratista" type="text" value={rfc} onChange={(e) => setRfc(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="email_contratista" className="mb-1 block text-sm font-medium text-text-secondary">
            Email
          </label>
          <input id="email_contratista" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="notas_contratista" className="mb-1 block text-sm font-medium text-text-secondary">
            Notas
          </label>
          <textarea id="notas_contratista" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancelar}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl border border-border text-base text-text-secondary transition hover:border-text-secondary hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={!puedeGuardar || guardando}
          style={{ minHeight: '56px' }}
          className="flex-1 rounded-xl bg-accent text-base font-bold text-highlight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : esEdicion ? '💾 Guardar cambios' : '+ Dar de alta'}
        </button>
      </div>
    </div>
  )
}
