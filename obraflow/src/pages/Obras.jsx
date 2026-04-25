import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const OBRA_VAZIA = { nome: '', orcamento: '', inicio: '', fim: '', prazo_meses: '', pavimentos: '' }

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function corObra(nome) {
  const cores = ['#c0392b','#2980b9','#27ae60','#8e44ad','#e67e22','#16a085']
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash += nome.charCodeAt(i)
  return cores[hash % cores.length]
}

function fmtMes(mes) {
  if (!mes) return '—'
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m)-1]}/${ano}`
}

function calcPrazo(inicio, fim) {
  if (!inicio || !fim) return ''
  const [anoI, mI] = inicio.split('-').map(Number)
  const [anoF, mF] = fim.split('-').map(Number)
  const meses = (anoF - anoI) * 12 + (mF - mI)
  return meses > 0 ? String(meses) : ''
}

export function Obras({ onNav }) {
  const { obras, setObras, setObraAtiva } = useApp()
  const [modalAberto, setModalAberto] = useState(false)
  const [obraEditando, setObraEditando] = useState(null)
  const [form, setForm] = useState(OBRA_VAZIA)
  const [logos, setLogos] = useState({})
  const [medicoes, setMedicoes] = useState({})
  const [uploadando, setUploadando] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { carregarObras() }, [])

  async function carregarObras() {
    const { data } = await supabase.from('obras').select('*')
    setObras(data || [])
    if (data?.length) {
      const logosCarregadas = {}
      for (const obra of data) {
        const { data: urlData } = supabase.storage.from('obras').getPublicUrl(`logos/${obra.id}.png`)
        const res = await fetch(urlData.publicUrl + '?t=' + Date.now(), { method: 'HEAD' }).catch(() => null)
        if (res?.ok) logosCarregadas[obra.id] = urlData.publicUrl + '?t=' + Date.now()
      }
      setLogos(logosCarregadas)
      const { data: meds } = await supabase.from('medicoes').select('obra_id').in('obra_id', data.map(o => o.id))
      const contagem = {}
      meds?.forEach(m => { contagem[m.obra_id] = (contagem[m.obra_id] || 0) + 1 })
      setMedicoes(contagem)
    }
  }

  async function uploadLogo(file) {
    if (!obraEditando) return
    setUploadando(true)
    try {
      const { error } = await supabase.storage
        .from('obras')
        .upload(`logos/${obraEditando.id}.png`, file, { upsert: true, contentType: file.type || 'image/png' })
      if (error) { alert('Erro ao enviar logo: ' + error.message); return }
      const { data } = supabase.storage.from('obras').getPublicUrl(`logos/${obraEditando.id}.png`)
      const novaUrl = data.publicUrl + '?t=' + Date.now()
      setLogos(prev => ({ ...prev, [obraEditando.id]: novaUrl }))
    } catch (e) {
      alert('Erro inesperado: ' + e.message)
    } finally {
      setUploadando(false)
    }
  }

  function setFormField(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'inicio' || field === 'fim') {
        next.prazo_meses = calcPrazo(
          field === 'inicio' ? value : next.inicio,
          field === 'fim'    ? value : next.fim
        )
      }
      return next
    })
  }

  function abrirModalNova() {
    setObraEditando(null)
    setForm(OBRA_VAZIA)
    setModalAberto(true)
  }

  function abrirModalEditar(obra, e) {
    e.stopPropagation()
    setObraEditando(obra)
    setForm({
      nome:        obra.nome        || '',
      orcamento:   obra.orcamento   || '',
      inicio:      obra.inicio      || '',
      fim:         obra.fim         || '',
      prazo_meses: obra.prazo_meses || '',
      pavimentos:  obra.pavimentos  || '',
    })
    setModalAberto(true)
  }

  async function salvar() {
    if (!form.nome) return
    const payload = {
      nome:        form.nome,
      orcamento:   form.orcamento,
      inicio:      form.inicio,
      fim:         form.fim,
      prazo_meses: form.prazo_meses ? Number(form.prazo_meses) : null,
      pavimentos:  form.pavimentos  ? Number(form.pavimentos)  : null,
    }
    if (obraEditando) {
      const { data, error } = await supabase.from('obras').update(payload).eq('id', obraEditando.id).select()
      if (error) { alert('Erro: ' + error.message); return }
      if (data) setObras(obras.map(o => o.id === obraEditando.id ? data[0] : o))
    } else {
      const { data, error } = await supabase.from('obras').insert([payload]).select()
      if (error) { alert('Erro: ' + error.message); return }
      if (data) setObras([...obras, data[0]])
    }
    setModalAberto(false)
  }

  const logoAtual = obraEditando ? logos[obraEditando.id] : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div className="pg-title" style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase' }}>
            OBRAS
          </div>
          <div className="pg-sub">
            {obras.length === 0 ? 'Nenhuma obra cadastrada'
              : `${obras.length} obra${obras.length > 1 ? 's' : ''} cadastrada${obras.length > 1 ? 's' : ''}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={abrirModalNova}>+ Nova Obra</button>
      </div>

      {obras.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ico">🏗</div>
          <div>Nenhuma obra cadastrada</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Clique em "+ Nova Obra" para começar</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {obras.map(obra => {
            const cor = corObra(obra.nome)
            return (
              <div key={obra.id} style={{
                borderRadius: '14px', overflow: 'hidden',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Topo: logo em destaque */}
                <div style={{
                  padding: '28px 20px 20px',
                  background: 'var(--surface2)',
                  display: 'flex', alignItems: 'center', gap: '18px',
                  borderBottom: `3px solid ${cor}`,
                  position: 'relative'
                }}>
                  {/* Logo grande */}
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '14px',
                    border: `2px solid ${cor}`,
                    background: 'var(--surface)',
                    overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 16px ${cor}44`
                  }}>
                    {logos[obra.id] ? (
                      <img src={logos[obra.id]} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        fontFamily: 'Bebas Neue, sans-serif', fontSize: '32px',
                        color: cor, letterSpacing: '2px'
                      }}>
                        {obra.nome.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Nome e badges */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, textTransform: 'uppercase' }}>
                      {obra.nome.toUpperCase()}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: `${cor}22`, color: cor,
                        borderRadius: '20px', padding: '2px 10px',
                        fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px'
                      }}>● EM ANDAMENTO</span>
                      <span style={{
                        background: 'var(--surface)', color: 'var(--muted)',
                        borderRadius: '20px', padding: '2px 10px', fontSize: '10px'
                      }}>
                        📋 {medicoes[obra.id] || 0} medição{(medicoes[obra.id] || 0) !== 1 ? 'ões' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Botão editar no canto */}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '12px' }}
                    onClick={e => abrirModalEditar(obra, e)}
                  >✏️ Editar</button>
                </div>

                {/* Corpo */}
                <div style={{ padding: '16px' }}>
                  {obra.orcamento > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        Orçamento Base
                      </div>
                      <div style={{ fontWeight: 700, color: cor, fontSize: '18px' }}>{fmt(obra.orcamento)}</div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { label: 'Início',     valor: fmtMes(obra.inicio) },
                      { label: 'Fim',        valor: fmtMes(obra.fim) },
                      { label: 'Prazo',      valor: obra.prazo_meses ? `${obra.prazo_meses} meses` : '—' },
                      { label: 'Pavimentos', valor: obra.pavimentos   ? `${obra.pavimentos} pav.`  : '—' },
                    ].map(({ label, valor }) => (
                      <div key={label}>
                        <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>{valor}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => { setObraAtiva(obra); onNav('detalhe') }}
                  >Abrir obra →</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="modal-bg" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: '100%' }}>
            <h3 style={{ marginBottom: '20px' }}>{obraEditando ? 'Editar Obra' : 'Nova Obra'}</h3>

            {obraEditando && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '14px', background: 'var(--surface)', borderRadius: '10px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '10px',
                  border: '2px solid var(--border)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface2)', flexShrink: 0
                }}>
                  {uploadando ? (
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>...</span>
                  ) : logoAtual ? (
                    <img src={logoAtual} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px', color: 'var(--muted)' }}>🏗</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Logo da Obra</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadando}
                  >
                    {uploadando ? 'Enviando...' : logoAtual ? '✏️ Trocar logo' : '📷 Adicionar logo'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) uploadLogo(e.target.files[0]) }} />
                </div>
              </div>
            )}

            <div className="fg">
              <label>Nome da Obra *</label>
              <input value={form.nome} onChange={e => setFormField('nome', e.target.value)} placeholder="Ex: Residencial Alfa" />
            </div>
            <div className="fg">
              <label>Orçamento Base (R$)</label>
              <input type="number" value={form.orcamento} onChange={e => setFormField('orcamento', e.target.value)} placeholder="0,00" />
            </div>
            <div className="form-row">
              <div className="fg" style={{ margin: 0 }}>
                <label>Data de Início</label>
                <input type="month" value={form.inicio} onChange={e => setFormField('inicio', e.target.value)} />
              </div>
              <div className="fg" style={{ margin: 0 }}>
                <label>Data de Fim</label>
                <input type="month" value={form.fim} onChange={e => setFormField('fim', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="fg" style={{ margin: 0 }}>
                <label>Prazo (meses)</label>
                <input type="number" value={form.prazo_meses} readOnly
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  placeholder="Calculado automaticamente" />
              </div>
              <div className="fg" style={{ margin: 0 }}>
                <label>Nº de Pavimentos</label>
                <input type="number" value={form.pavimentos} onChange={e => setFormField('pavimentos', e.target.value)} placeholder="Ex: 4" />
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}>{obraEditando ? 'Salvar Alterações' : 'Criar Obra'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}