import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

export function ResumoObra({ onNav }) {
  const { obraAtiva } = useApp()
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(false)

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
        const pctFalta = p.valor_total > 0 ? (falta / p.valor_total) * 100 : 0
        return { ...p, medido, falta, pctFalta }
      })

      setDados(resultado)
      setCarregando(false)
    }
    carregar()
  }, [obraAtiva])

  const totalOrcado   = dados.reduce((s, d) => s + Number(d.valor_total), 0)
  const totalMedido   = dados.reduce((s, d) => s + d.medido, 0)
  const totalFalta    = dados.reduce((s, d) => s + d.falta, 0)
  const pctFaltaGeral = totalOrcado > 0 ? (totalFalta / totalOrcado) * 100 : 0

  if (!obraAtiva) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
        Nenhuma obra selecionada
      </div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
        Vá até a aba Obras, abra a obra desejada e volte aqui para ver o resumo.
      </div>
      <button className="btn btn-primary" onClick={() => onNav('obras')}>→ Ir para Obras</button>
    </div>
  )

  return (
    <div>
      <div className="pg-title" style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>
        Resumo de Obra
      </div>

      <BannerObra obraAtiva={obraAtiva} onTrocar={() => onNav('obras')} />

      {carregando && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: '13px' }}>
          Carregando...
        </div>
      )}

      {!carregando && (
        <>
          {/* Cards — align-items: stretch faz todos ficarem com a mesma altura */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            {[
              { label: 'Total Orçado', valor: fmt(totalOrcado),               cor: '#c8b89a' },
              { label: 'Total Medido', valor: fmt(totalMedido),               cor: 'var(--accent2)' },
              { label: 'Falta Medir',  valor: fmt(totalFalta),                cor: 'var(--accent)' },
              { label: '% Falta',      valor: pctFaltaGeral.toFixed(1) + '%', cor: '#f5a623' },
            ].map(c => (
              <div key={c.label} style={{
                background: 'var(--surface2)', borderRadius: '10px',
                padding: '20px 24px', flex: '1', minWidth: '160px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '6px' }}>
                  {c.label.toUpperCase()}
                </div>
                <div style={{ fontSize: '22px', fontFamily: 'Bebas Neue, sans-serif', color: c.cor }}>
                  {c.valor}
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
                      {fmt(d.valor_total)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent2)' }}>
                      {fmt(d.medido)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent)' }}>
                      {fmt(d.falta)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden'
                        }}>
                          <div style={{
                            width: Math.min(d.pctFalta, 100) + '%',
                            height: '100%', background: 'var(--accent)', borderRadius: '3px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', minWidth: '36px' }}>
                          {d.pctFalta.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {dados.length === 0 && (
              <div className="empty-state">
                <div className="empty-ico">📋</div>
                <div>Nenhum pacote cadastrado</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}