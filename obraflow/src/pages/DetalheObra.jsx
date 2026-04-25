import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const CATEGORIAS = ['Diretos Civil', 'Diretos Instalações', 'Indiretos']

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DetalheObra({ onNav }) {
  const { obraAtiva } = useApp()
  const [pacotes, setPacotes] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [novoPacote, setNovoPacote] = useState({ nome: '', categoria: 'Diretos Civil', pavimentos: [{ nome: '', valor: '' }] })

  useEffect(() => {
    if (obraAtiva) carregarPacotes()
  }, [obraAtiva])

  async function carregarPacotes() {
    const { data: pacs } = await supabase
      .from('pacotes')
      .select('*, pavimentos(*)')
      .eq('obra_id', obraAtiva.id)
    setPacotes(pacs || [])
  }

  async function salvarPacote() {
    if (!novoPacote.nome) return
    const pavsFiltrados = novoPacote.pavimentos.filter(p => p.nome)
    const valorTotal = pavsFiltrados.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0)

    const { data: pacData } = await supabase.from('pacotes').insert([{
      obra_id: obraAtiva.id,
      nome: novoPacote.nome,
      categoria: novoPacote.categoria,
      valor_total: valorTotal
    }]).select()

    if (pacData?.[0] && pavsFiltrados.length > 0) {
      await supabase.from('pavimentos').insert(
        pavsFiltrados.map(p => ({ pacote_id: pacData[0].id, nome: p.nome, valor: parseFloat(p.valor) || 0 }))
      )
    }

    setModalAberto(false)
    setNovoPacote({ nome: '', categoria: 'Diretos Civil', pavimentos: [{ nome: '', valor: '' }] })
    carregarPacotes()
  }

  async function removerPacote(id) {
    await supabase.from('pavimentos').delete().eq('pacote_id', id)
    await supabase.from('pacotes').delete().eq('id', id)
    setPacotes(pacotes.filter(p => p.id !== id))
  }

  function addPavimento() {
    setNovoPacote({ ...novoPacote, pavimentos: [...novoPacote.pavimentos, { nome: '', valor: '' }] })
  }

  function updatePav(i, field, val) {
    const pavs = [...novoPacote.pavimentos]
    pavs[i] = { ...pavs[i], [field]: val }
    setNovoPacote({ ...novoPacote, pavimentos: pavs })
  }

  if (!obraAtiva) return <div className="pg-head"><div className="pg-title">Nenhuma obra selecionada</div></div>

  const totalObra = pacotes.reduce((s, p) => s + (p.valor_total || 0), 0)

  return (
    <div>
      {/* Cabeçalho */}
      <div className="pg-head">
        <div>
          <div style={{ fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onNav('obras')}>Obras</span>
            {' › '}{obraAtiva.nome.toUpperCase()}
          </div>
          <div className="pg-title" style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase' }}>
            {obraAtiva.nome.toUpperCase()}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>
            Orçamento base: {fmt(obraAtiva.orcamento)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => setModalAberto(true)}>+ Pacote</button>
          <button className="btn btn-primary" onClick={() => onNav('medicao')}>Iniciar Medição →</button>
        </div>
      </div>

      {/* Pacotes por categoria */}
      {CATEGORIAS.map(cat => {
        const lista = pacotes.filter(p => p.categoria === cat)
        if (lista.length === 0) return null
        return (
          <div key={cat} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>
              {cat}
            </div>
            {lista.map(p => {
              const aberto = expandido === p.id
              const pavs = p.pavimentos || []
              const totalPac = pavs.reduce((s, v) => s + (v.valor || 0), 0)
              return (
                <div key={p.id} className="card" style={{ marginBottom: '8px', padding: 0 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', cursor: 'pointer' }}
                    onClick={() => setExpandido(aberto ? null : p.id)}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.nome}</div>
                      <div style={{ fontSize: '13px', opacity: 0.6 }}>
                        {fmt(totalPac || p.valor_total)} total — {pavs.length} pavimentos
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn" style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={e => { e.stopPropagation(); removerPacote(p.id) }}>
                        remover
                      </button>
                      <span style={{ opacity: 0.4 }}>{aberto ? '∨' : '›'}</span>
                    </div>
                  </div>

                  {aberto && pavs.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ opacity: 0.5, textTransform: 'uppercase', fontSize: '11px' }}>
                            <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Pavimento</th>
                            <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Valor Orçado</th>
                            <th style={{ textAlign: 'left', paddingBottom: '8px' }}>% do Pacote</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pavs.map(pav => (
                            <tr key={pav.id} style={{ borderTop: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 0' }}>{pav.nome}</td>
                              <td>{fmt(pav.valor)}</td>
                              <td>{totalPac ? ((pav.valor / totalPac) * 100).toFixed(1) + '%' : '—'}</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '1px solid var(--border)', fontWeight: 700 }}>
                            <td style={{ padding: '10px 0' }}>TOTAL</td>
                            <td>{fmt(totalPac)}</td>
                            <td>100%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {pacotes.length === 0 && (
        <div className="empty-state">
          <div className="empty-ico">📦</div>
          <div>Nenhum pacote cadastrado</div>
        </div>
      )}

      {/* Modal novo pacote */}
      {modalAberto && (
        <div className="modal-bg" onClick={() => setModalAberto(false)}>
          <div className="modal" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Novo Pacote</div>
              <button className="modal-close" onClick={() => setModalAberto(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="fg">
                <label>Nome do Pacote *</label>
                <input value={novoPacote.nome}
                  onChange={e => setNovoPacote({ ...novoPacote, nome: e.target.value })}
                  placeholder="Ex: Fundação, Estrutura..." />
              </div>
              <div className="fg">
                <label>Categoria</label>
                <select value={novoPacote.categoria}
                  onChange={e => setNovoPacote({ ...novoPacote, categoria: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit' }}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Pavimentos</label>
                {novoPacote.pavimentos.map((pav, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <input placeholder="Nome (ex: Térreo)" value={pav.nome}
                      onChange={e => updatePav(i, 'nome', e.target.value)}
                      style={{ flex: 2 }} />
                    <input placeholder="Valor R$" type="number" value={pav.valor}
                      onChange={e => updatePav(i, 'valor', e.target.value)}
                      style={{ flex: 1 }} />
                  </div>
                ))}
                <button className="btn" style={{ fontSize: '12px', marginTop: '4px' }} onClick={addPavimento}>
                  + Pavimento
                </button>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarPacote}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}