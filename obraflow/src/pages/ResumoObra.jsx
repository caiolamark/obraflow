import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export function ResumoObra() {
  const { obraAtiva, setObraAtiva } = useApp()
  const [obras, setObras] = useState([])
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    async function carregarObras() {
      const { data } = await supabase.from('obras').select('*')
      setObras(data || [])
    }
    carregarObras()
  }, [])

  useEffect(() => {
    if (!obraAtiva) return
    async function carregar() {
      setCarregando(true)

      const { data: pacotes } = await supabase
        .from('pacotes')
        .select('id, nome, categoria, valor_total')
        .eq('obra_id', obraAtiva.id)

      const { data: medidos } = await supabase
        .from('medicao_detalhes')
        .select('pac_id, val')
        .in('pac_id', pacotes.map(p => p.id))

      const totalPorPacote = {}
      medidos?.forEach(m => {
        totalPorPacote[m.pac_id] = (totalPorPacote[m.pac_id] || 0) + Number(m.val)
      })

      const resultado = pacotes.map(p => {
        const medido = totalPorPacote[p.id] || 0
        const falta = p.valor_total - medido
        // % falta em relação ao orçamento do próprio pacote
        const pctPacote = p.valor_total > 0 ? (falta / p.valor_total) * 100 : 0
        return { ...p, medido, falta, pctPacote }
      })

      setDados(resultado)
      setCarregando(false)
    }
    carregar()
  }, [obraAtiva])

  const totalOrcadoPacotes = dados.reduce((s, d) => s + Number(d.valor_total), 0)
  const totalFalta = dados.reduce((s, d) => s + d.falta, 0)
  const totalMedido = dados.reduce((s, d) => s + d.medido, 0)
  const pctFaltaGeral = totalOrcadoPacotes > 0 ? (totalFalta / totalOrcadoPacotes) * 100 : 0

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', color: 'var(--accent)', marginBottom: '20px' }}>
        Resumo de Obra
      </h2>

      {/* Seletor de obra */}
      <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '20px', marginBottom: '28px' }}>
        <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px' }}>
          SELECIONE A OBRA
        </div>
        <select
          value={obraAtiva?.id || ''}
          onChange={e => {
            const obra = obras.find(o => o.id === e.target.value)
            setObraAtiva(obra || null)
          }}
          style={{
            width: '100%', padding: '10px 14px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '6px', color: 'var(--text)', fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value=''>-- Selecione uma obra --</option>
          {obras.map(o => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      </div>

      {!obraAtiva && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: '13px' }}>
          Selecione uma obra acima para ver o resumo.
        </div>
      )}

      {obraAtiva && carregando && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: '13px' }}>
          Carregando...
        </div>
      )}

      {obraAtiva && !carregando && (
        <>
          {/* Cards de totais */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Orçado (Pacotes)', valor: totalOrcadoPacotes, cor: '#c8b89a' },
              { label: 'Total Medido', valor: totalMedido, cor: 'var(--accent2)' },
              { label: 'Falta Medir', valor: totalFalta, cor: 'var(--accent)' },
              { label: '% Falta do Total Orçado', valor: pctFaltaGeral.toFixed(1) + '%', cor: '#f5a623' },
            ].map(c => (
              <div key={c.label} style={{
                background: 'var(--surface2)', borderRadius: '10px',
                padding: '20px 24px', flex: '1', minWidth: '160px'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '6px' }}>
                  {c.label.toUpperCase()}
                </div>
                <div style={{ fontSize: '22px', fontFamily: 'Bebas Neue, sans-serif', color: c.cor }}>
                  {typeof c.valor === 'number'
                    ? 'R$ ' + c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                    : c.valor}
                </div>
              </div>
            ))}
          </div>

          {/* Tabela por pacote */}
          <div style={{ background: 'var(--surface2)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Pacote', 'Categoria', 'Orçado', 'Medido', 'Falta Medir', '% Falta do Pacote'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px', fontWeight: 600
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((d, i) => (
                  <tr key={d.id} style={{
                    borderBottom: i < dados.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                  }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{d.nome}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{d.categoria}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                      R$ {Number(d.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent2)' }}>
                      R$ {d.medido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent)' }}>
                      R$ {d.falta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'
                        }}>
                          <div style={{
                            width: Math.min(d.pctPacote, 100) + '%',
                            height: '100%', background: 'var(--accent)', borderRadius: '3px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', minWidth: '36px' }}>
                          {d.pctPacote.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}