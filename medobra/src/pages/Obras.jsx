import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export function Obras({ onNav }) {
  const { obras, setObras, setObraAtiva } = useApp()
  const [modalAberto, setModalAberto] = useState(false)
  const [novaObra, setNovaObra] = useState({ nome: '', cliente: '', contrato: '', orcamento: '', inicio: '' })

  useEffect(() => {
    carregarObras()
  }, [])

  async function carregarObras() {
    const { data } = await supabase.from('obras').select('*')
    setObras(data || [])
  }

  async function salvarObra() {
    if (!novaObra.nome) return
    const { data } = await supabase.from('obras').insert([novaObra]).select()
    if (data) setObras([...obras, data[0]])
    setNovaObra({ nome: '', cliente: '', contrato: '', orcamento: '', inicio: '' })
    setModalAberto(false)
  }

  function fmt(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div className="pg-title">Obras</div>
          <div className="pg-sub">
            {obras.length === 0
              ? 'Nenhuma obra cadastrada'
              : `${obras.length} obra${obras.length > 1 ? 's' : ''} cadastrada${obras.length > 1 ? 's' : ''}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalAberto(true)}>+ Nova Obra</button>
      </div>

      {/* Lista */}
      {obras.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ico">🏗</div>
          <div>Nenhuma obra cadastrada</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Clique em "+ Nova Obra" para começar</div>
        </div>
      ) : (
        <div className="card-grid">
          {obras.map(obra => (
            <div key={obra.id} className="obra-card">
              {/* Topo do card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <h3 style={{ margin: 0 }}>{obra.nome}</h3>
                  </div>
                  {obra.cliente  && <div className="meta">👤 {obra.cliente}</div>}
                  {obra.contrato && <div className="meta">📄 {obra.contrato}</div>}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setObraAtiva(obra); onNav('detalhe') }}
                >
                  Abrir →
                </button>
              </div>

              {/* Orçamento */}
              {obra.orcamento > 0 && (
                <div style={{ background: 'var(--surface2)', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Orçamento Base</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '14px' }}>{fmt(obra.orcamento)}</div>
                </div>
              )}

              {/* Rodapé */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>🏗 Em andamento</span>
                {obra.inicio && <span>Início: {obra.inicio}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova obra */}
      {modalAberto && (
        <div className="modal-bg" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nova Obra</h3>
            <div className="fg">
              <label>Nome da Obra *</label>
              <input
                value={novaObra.nome}
                onChange={e => setNovaObra({ ...novaObra, nome: e.target.value })}
                placeholder="Ex: Residencial Alfa"
              />
            </div>
            <div className="fg">
              <label>Cliente</label>
              <input
                value={novaObra.cliente}
                onChange={e => setNovaObra({ ...novaObra, cliente: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="form-row">
              <div className="fg" style={{ margin: 0 }}>
                <label>Nº do Contrato</label>
                <input
                  value={novaObra.contrato}
                  onChange={e => setNovaObra({ ...novaObra, contrato: e.target.value })}
                  placeholder="Ex: 2024-001"
                />
              </div>
              <div className="fg" style={{ margin: 0 }}>
                <label>Orçamento Base (R$)</label>
                <input
                  type="number"
                  value={novaObra.orcamento}
                  onChange={e => setNovaObra({ ...novaObra, orcamento: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="fg" style={{ marginTop: '14px' }}>
              <label>Data de Início</label>
              <input
                type="month"
                value={novaObra.inicio}
                onChange={e => setNovaObra({ ...novaObra, inicio: e.target.value })}
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarObra}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}