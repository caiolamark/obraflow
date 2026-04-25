import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

const CATEGORIAS = ['Diretos Civil', 'Diretos Instalações', 'Indiretos']

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtMes(mes) {
  if (!mes) return ''
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m)-1]}/${ano}`
}

function BannerObra({ obraAtiva, onTrocar }) {
  if (!obraAtiva) return null
  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: '10px',
      padding: '12px 20px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '12px',
      border: '1px solid var(--border)'
    }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' }}>OBRA SELECIONADA</div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{obraAtiva.nome}</div>
      </div>
      {obraAtiva.orcamento > 0 && (
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' }}>ORÇAMENTO</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{fmt(obraAtiva.orcamento)}</div>
        </div>
      )}
      <button className="btn btn-ghost btn-sm" onClick={onTrocar} style={{ marginLeft: '8px', fontSize: '11px' }}>
        Trocar obra
      </button>
    </div>
  )
}

export function Comparativo({ onNav }) {
  const { obraAtiva } = useApp()
  const [pacotes, setPacotes] = useState([])
  const [medicoes, setMedicoes] = useState([])
  const [detalhes, setDetalhes] = useState([])

  useEffect(() => {
    if (!obraAtiva?.id) return
    Promise.all([
      supabase.from('pacotes').select('id, nome, categoria, valor_total').eq('obra_id', obraAtiva.id),
      supabase.from('medicoes').select('*').eq('obra_id', obraAtiva.id).order('mes', { ascending: true }),
    ]).then(([{ data: pacs }, { data: meds }]) => {
      setPacotes(pacs || [])
      setMedicoes(meds || [])
      if (meds?.length) {
        supabase.from('medicao_detalhes').select('*')
          .in('medicao_id', meds.map(m => m.id))
          .then(({ data }) => setDetalhes(data || []))
      } else {
        setDetalhes([])
      }
    })
  }, [obraAtiva])

  function pctPacoteMes(pacote, medicaoId) {
    const dets = detalhes.filter(d => d.pac_id === pacote.id && d.medicao_id === medicaoId && d.pct > 0)
    if (!dets.length) return null
    const somaVal = dets.reduce((s, d) => s + (d.val || 0), 0)
    const valorTotal = pacote.valor_total || 0
    if (valorTotal === 0) return null
    return (somaVal / valorTotal * 100).toFixed(1)
  }

  const pacotesMedidos = new Set(detalhes.filter(d => d.pct > 0).map(d => d.pac_id))

  const medicoesComAcum = medicoes.map((m, i) => ({
    ...m,
    pct_acum: medicoes.slice(0, i + 1).reduce((s, x) => s + (x.pct_mes || 0), 0)
  }))

  const chartData = medicoesComAcum.map(m => ({
    mes: fmtMes(m.mes),
    mes_pct: parseFloat((m.pct_mes || 0).toFixed(2)),
    acum_pct: parseFloat((m.pct_acum || 0).toFixed(2)),
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1814', border: '1px solid #333', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
        <div style={{ fontWeight: 700, marginBottom: '6px', color: '#fff' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.fill, marginBottom: '2px' }}>
            {p.name}: {p.value}%
          </div>
        ))}
      </div>
    )
  }

  if (!obraAtiva) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
        Nenhuma obra selecionada
      </div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
        Vá até a aba Obras, abra a obra desejada e volte aqui para comparar.
      </div>
      <button className="btn btn-primary" onClick={() => onNav('obras')}>→ Ir para Obras</button>
    </div>
  )

  return (
    <div>
      <div className="pg-title" style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>
        Comparativo
      </div>

      <BannerObra obraAtiva={obraAtiva} onTrocar={() => onNav('obras')} />

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', opacity: 0.5, marginBottom: '16px', textTransform: 'uppercase' }}>
            Avanço Geral da Obra — Mês a Mês
          </div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.7 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f5a623' }} /> % do mês
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.7 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#e8714a' }} /> % acumulado
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 16, left: -16, bottom: 8 }} barCategoryGap="30%">
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--muted, #888)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted, #888)' }} tickFormatter={v => `${v}%`} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mes_pct" name="% do mês" fill="#f5a623" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  <LabelList dataKey="mes_pct" position="top" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#f5a623' }} />
                </Bar>
                <Bar dataKey="acum_pct" name="% acumulado" fill="#e8714a" radius={[4, 4, 0, 0]} maxBarSize={52}>
                  <LabelList dataKey="acum_pct" position="top" formatter={v => `${v}%`} style={{ fontSize: 11, fill: '#e8714a' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {CATEGORIAS.map(cat => {
        const lista = pacotes.filter(p => p.categoria === cat && pacotesMedidos.has(p.id))
        if (!lista.length) return null
        return (
          <div key={cat} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>
              {cat}
            </div>
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase' }}>Pacote</th>
                    {medicoes.map(m => (
                      <th key={m.id} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase' }}>
                        {fmtMes(m.mes).toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>{p.nome}</td>
                      {medicoes.map(m => {
                        const pct = pctPacoteMes(p, m.id)
                        return (
                          <td key={m.id} style={{ padding: '12px 16px', opacity: pct === null ? 0.3 : 1 }}>
                            {pct !== null ? `${pct}%` : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {pacotesMedidos.size === 0 && (
        <div className="empty-state">
          <div className="empty-ico">📊</div>
          <div>Nenhum dado para comparar</div>
        </div>
      )}
    </div>
  )
}