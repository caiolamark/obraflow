import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CATEGORIAS = ['Diretos Civil', 'Diretos Instalações', 'Indiretos']
const CAT_COLORS = {
  'Diretos Civil': '#f5a623',
  'Diretos Instalações': '#e8714a',
  'Indiretos': '#7c6f64',
}

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtMes(mes) {
  if (!mes) return ''
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m)-1]}/${ano}`
}

export function Historico() {
  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState('')
  const [medicoes, setMedicoes] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [detalhes, setDetalhes] = useState({})
  const [pacotes, setPacotes] = useState([])

  useEffect(() => {
    supabase.from('obras').select('*').then(({ data }) => {
      setObras(data || [])
      if (data?.[0]) setObraId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!obraId) return
    supabase.from('pacotes').select('id, nome, categoria, valor_total').eq('obra_id', obraId)
      .then(({ data }) => setPacotes(data || []))
    carregarMedicoes()
  }, [obraId])

  async function carregarMedicoes() {
    const { data } = await supabase
      .from('medicoes').select('*').eq('obra_id', obraId).order('mes', { ascending: true })
    setMedicoes(data || [])
  }

  async function toggleExpandir(med) {
    if (expandido === med.id) { setExpandido(null); return }
    setExpandido(med.id)
    if (detalhes[med.id]) return
    const { data } = await supabase
      .from('medicao_detalhes').select('*').eq('medicao_id', med.id)
    setDetalhes(d => ({ ...d, [med.id]: data || [] }))
  }

  const medicoesComAcum = medicoes.map((m, i) => ({
    ...m,
    pct_acum: medicoes.slice(0, i + 1).reduce((s, x) => s + (x.pct_mes || 0), 0)
  }))

  function agruparPorPacote(dets) {
    const map = {}
    dets.filter(d => d.pct > 0).forEach(d => {
      if (!map[d.pac_id]) {
        map[d.pac_id] = { pac_id: d.pac_id, pac_nome: d.pac_nome, categoria: d.categoria, pavimentos: [], totalVal: 0 }
      }
      map[d.pac_id].pavimentos.push(d)
      map[d.pac_id].totalVal += (d.val || 0)
    })
    return Object.values(map).map(pac => {
      const pacInfo = pacotes.find(p => p.id === pac.pac_id)
      const valorTotal = pacInfo?.valor_total || 0
      const pctTotal = valorTotal > 0 ? (pac.totalVal / valorTotal) * 100 : null
      return { ...pac, pctTotal, valorTotal }
    })
  }

  function buildChartData(pacotesAgrupados) {
    return pacotesAgrupados.map(p => ({
      nome: p.pac_nome.length > 14 ? p.pac_nome.slice(0, 14) + '…' : p.pac_nome,
      nomeCompleto: p.pac_nome,
      pct: p.pctTotal !== null ? parseFloat(p.pctTotal.toFixed(1)) : 0,
      categoria: p.categoria,
    }))
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: '#1a1814', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
        <div style={{ fontWeight: 700, marginBottom: '4px', color: '#fff' }}>{d.nomeCompleto}</div>
        <div style={{ color: '#f5a623' }}>{d.pct.toFixed(1)}% medido</div>
        <div style={{ color: '#888', fontSize: '11px' }}>{d.categoria}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="pg-title" style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '24px' }}>
        Histórico
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>Obra</div>
        <select value={obraId} onChange={e => setObraId(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '14px' }}>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </div>

      {medicoesComAcum.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ico">📅</div>
          <div>Nenhuma medição registrada</div>
        </div>
      ) : (
        medicoesComAcum.map(med => {
          const dets = detalhes[med.id] || []
          const pacotesAgrupados = agruparPorPacote(dets)
          const chartData = buildChartData(pacotesAgrupados)

          return (
            <div key={med.id} className="card" style={{ marginBottom: '8px', padding: 0 }}>
              {/* Cabeçalho */}
              <div onClick={() => toggleExpandir(med)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}>
                <span style={{ background: 'var(--border)', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                  {fmtMes(med.mes)}
                </span>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{fmt(med.total_mes)}</span>
                <span style={{ background: '#f5a62322', color: '#f5a623', borderRadius: '4px', padding: '3px 8px', fontSize: '12px' }}>
                  {(med.pct_mes || 0).toFixed(2)}% mês
                </span>
                <span style={{ background: '#33333322', borderRadius: '4px', padding: '3px 8px', fontSize: '12px' }}>
                  Acum: {(med.pct_acum || 0).toFixed(2)}%
                </span>
                <span style={{ marginLeft: 'auto', opacity: 0.4 }}>{expandido === med.id ? '▲' : '▼'}</span>
              </div>

              {/* Expandido */}
              {expandido === med.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                  {pacotesAgrupados.length === 0 ? (
                    <div style={{ opacity: 0.4, fontSize: '13px', textAlign: 'center', padding: '12px 0' }}>
                      Sem detalhes registrados para esta medição
                    </div>
                  ) : (
                    <>
                      {/* Gráfico de colunas por pacote */}
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', opacity: 0.5, marginBottom: '12px', textTransform: 'uppercase' }}>
                        % Medido por Pacote
                      </div>
                      <div style={{ width: '100%', height: 220, marginBottom: '24px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
                            <XAxis
                              dataKey="nome"
                              tick={{ fontSize: 11, fill: 'var(--muted, #888)' }}
                              angle={-35}
                              textAnchor="end"
                              interval={0}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: 'var(--muted, #888)' }}
                              tickFormatter={v => `${v}%`}
                              domain={[0, 100]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
                              {chartData.map((entry, i) => (
                                <Cell key={i} fill={CAT_COLORS[entry.categoria] || '#f5a623'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legenda de categorias */}
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {Object.entries(CAT_COLORS).map(([cat, cor]) => (
                          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.7 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: cor }} />
                            {cat}
                          </div>
                        ))}
                      </div>

                      {/* Tabela detalhe por pacote / pavimento */}
                      {CATEGORIAS.map(cat => {
                        const itensCat = pacotesAgrupados.filter(p => p.categoria === cat)
                        if (!itensCat.length) return null
                        return (
                          <div key={cat} style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', opacity: 0.5, marginBottom: '10px', textTransform: 'uppercase' }}>
                              {cat}
                            </div>
                            {itensCat.map(pac => (
                              <div key={pac.pac_id} style={{ marginBottom: '12px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '9px 14px', background: 'var(--surface, #f0ede8)',
                                }}>
                                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{pac.pac_nome}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '12px', opacity: 0.55 }}>{fmt(pac.totalVal)}</span>
                                    <span style={{ background: '#f5a62333', color: '#f5a623', padding: '2px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 700 }}>
                                      {pac.pctTotal !== null ? `${pac.pctTotal.toFixed(1)}%` : '—'}
                                    </span>
                                  </div>
                                </div>
                                {pac.pavimentos.map((d, i) => (
                                  <div key={i} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '6px 14px 6px 28px', borderTop: '1px solid var(--border)', fontSize: '12px',
                                  }}>
                                    <span style={{ opacity: 0.65 }}>{d.pav_nome}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span style={{ opacity: 0.45 }}>{fmt(d.val)}</span>
                                      <span style={{ background: 'var(--border)', padding: '2px 8px', borderRadius: '4px', opacity: 0.8 }}>
                                        {Number(d.pct).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}