import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const CATEGORIAS = ['Diretos Civil', 'Diretos Instalações', 'Indiretos']

function fmt(v) {
  return 'R$ ' + Number(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})
}
function fmtMes(m) {
  if (!m) return ''
  const [y, mo] = m.split('-')
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][+mo-1]+'/'+y
}

export function Medicao({ onNav }) {
  const { obraAtiva } = useApp()
  const [step, setStep] = useState(1)
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7))
  const [pacotes, setPacotes] = useState([])
  const [selecionados, setSelecionados] = useState([])
  const [percentuais, setPercentuais] = useState({})
  const [acumAnt, setAcumAnt] = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (obraAtiva?.id) carregarPacotes()
  }, [obraAtiva])

  async function carregarPacotes() {
    const { data } = await supabase
      .from('pacotes').select('*, pavimentos(*)').eq('obra_id', obraAtiva.id)
    setPacotes(data || [])
  }

  async function irStep3() {
    if (!selecionados.length) return alert('Selecione ao menos um pacote')
    const { data: medsAnt } = await supabase
      .from('medicao_detalhes')
      .select('pac_id, pav_nome, pct')
      .in('pac_id', selecionados)
    const acum = {}
    ;(medsAnt || []).forEach(d => {
      const k = d.pac_id + '_' + d.pav_nome
      acum[k] = (acum[k] || 0) + d.pct
    })
    setAcumAnt(acum)
    const init = {}
    pacotes.filter(p => selecionados.includes(p.id))
      .forEach(p => p.pavimentos.forEach(pv => { init[p.id+'_'+pv.nome] = '' }))
    setPercentuais(init)
    setStep(3)
  }

  function setPct(key, val, max) {
    const v = Math.min(Math.max(parseFloat(val) || 0, 0), max)
    setPercentuais(p => ({ ...p, [key]: val === '' ? '' : v }))
  }

  function calcResultado() {
    const pacsSel = pacotes.filter(p => selecionados.includes(p.id))
    let totalMes = 0
    const catMap = {}
    const detalhes = []
    pacsSel.forEach(pac => {
      let valPac = 0
      pac.pavimentos.forEach(pv => {
        const k = pac.id + '_' + pv.nome
        const ant = Math.min(acumAnt[k] || 0, 100)
        const max = 100 - ant
        const pct = Math.min(Math.max(parseFloat(percentuais[k]) || 0, 0), max)
        const val = pv.valor * (pct / 100)
        valPac += val
        if (pct > 0) detalhes.push({
          pacote_id: pac.id, pacote_nome: pac.nome,
          pacote_categoria: pac.categoria,
          pavimento_nome: pv.nome, pct, val
        })
      })
      totalMes += valPac
      if (!catMap[pac.categoria]) catMap[pac.categoria] = { val: 0, orc: 0 }
      catMap[pac.categoria].val += valPac
      catMap[pac.categoria].orc += (pac.valor_total || 0)
    })
    const pctMes = obraAtiva?.orcamento > 0 ? (totalMes / obraAtiva.orcamento) * 100 : 0
    return { totalMes, pctMes, catMap, detalhes }
  }

  async function salvarMedicao() {
    setSalvando(true)
    const { totalMes, pctMes, detalhes } = calcResultado()

    const { data: med, error: errMed } = await supabase.from('medicoes').insert([{
      obra_id: obraAtiva.id, mes, pct_mes: pctMes, total_mes: totalMes,
    }]).select()

    if (errMed) { alert('Erro: ' + errMed.message); setSalvando(false); return }

    if (med?.[0] && detalhes.length > 0) {
      const rows = detalhes.map(d => ({
        medicao_id: med[0].id,
        pac_id: d.pacote_id,
        pac_nome: d.pacote_nome,
        categoria: d.pacote_categoria,
        pav_nome: d.pavimento_nome,
        pct: d.pct,
        val: d.val,
      }))
      const { error: errDet } = await supabase.from('medicao_detalhes').insert(rows)
      if (errDet) { alert('Erro detalhes: ' + errDet.message); setSalvando(false); return }
    }
    setSalvando(false)
    onNav('historico')
  }

  const resultado = step === 4 ? calcResultado() : null
  const steps = ['Obra & Mês', 'Pacotes', 'Percentuais', 'Resultado']

  if (!obraAtiva) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗</div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>
        Nenhuma obra selecionada
      </div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
        Vá até a aba Obras, abra a obra desejada e volte aqui para medir.
      </div>
      <button className="btn btn-primary" onClick={() => onNav('obras')}>
        → Ir para Obras
      </button>
    </div>
  )

  return (
    <div>
      {salvando && (
        <div style={{position:'fixed',inset:0,background:'rgba(26,24,20,.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(3px)'}}>
          <div style={{background:'var(--surface,#fff)',border:'1px solid var(--border)',borderRadius:'8px',padding:'32px 48px',display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
            <div style={{fontSize:'24px'}}>⏳</div>
            <div style={{fontSize:'13px',fontWeight:600,fontFamily:'IBM Plex Mono,monospace'}}>Salvando medição...</div>
          </div>
        </div>
      )}

      <div className="pg-head">
        <div>
          <div className="pg-title" style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase' }}>
            NOVA MEDIÇÃO
          </div>
        </div>
      </div>

      {/* Banner da obra ativa */}
      <div style={{
        background: 'var(--surface2)', borderRadius: '10px',
        padding: '12px 20px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '12px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' }}>OBRA SELECIONADA</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{obraAtiva.nome.toUpperCase()}</div>
        </div>
        {obraAtiva.orcamento > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' }}>ORÇAMENTO</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{fmt(obraAtiva.orcamento)}</div>
          </div>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => onNav('obras')} style={{ marginLeft: '8px', fontSize: '11px' }}>
          Trocar obra
        </button>
      </div>

      {/* Step indicator */}
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={i} className={`step${step === i+1 ? ' active' : step > i+1 ? ' done' : ''}`}>
            {i+1} · {s}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <div className="card">
            <div className="fg" style={{margin:0}}>
              <label>Mês de Referência</label>
              <input type="month" value={mes} onChange={e => setMes(e.target.value)} />
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:'14px'}}>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Próximo →</button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <div className="card">
            <div style={{fontSize:'12px',color:'var(--muted)',marginBottom:'10px'}}>Selecione os pacotes que serão medidos neste mês:</div>
            <div className="pac-select-grid">
              {CATEGORIAS.map(cat => {
                const lista = pacotes.filter(p => p.categoria === cat)
                if (!lista.length) return null
                return (
                  <div key={cat} style={{gridColumn:'1/-1'}}>
                    <div className="sec-label">{cat}</div>
                    <div className="pac-select-grid" style={{marginTop:0}}>
                      {lista.map(p => {
                        const sel = selecionados.includes(p.id)
                        const total = (p.pavimentos||[]).reduce((s,v) => s+(v.valor||0), 0)
                        return (
                          <div key={p.id}
                            className={`pac-sel-item${sel ? ' selected' : ''}`}
                            onClick={() => setSelecionados(sel ? selecionados.filter(id => id !== p.id) : [...selecionados, p.id])}>
                            <div className="chk">{sel ? '✓' : ''}</div>
                            <div>
                              <div className="psi-name">{p.nome}</div>
                              <div className="psi-meta">{fmt(total)} — {(p.pavimentos||[]).length} pav.</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'14px'}}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Voltar</button>
            <button className="btn btn-primary" onClick={irStep3}>Próximo →</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <div id="med-pcts-form">
            {CATEGORIAS.map(cat => {
              const lista = pacotes.filter(p => selecionados.includes(p.id) && p.categoria === cat)
              if (!lista.length) return null
              return (
                <div key={cat}>
                  <div className="sec-label">{cat}</div>
                  {lista.map(pac => {
                    const total = (pac.pavimentos||[]).reduce((s,v) => s+(v.valor||0), 0)
                    return (
                      <div key={pac.id} className="med-pacote">
                        <div className="med-pacote-head">
                          <h4>{pac.nome}</h4>
                          <span style={{fontSize:'11px',color:'var(--muted)'}}>{fmt(total)}</span>
                        </div>
                        <div>
                          {(pac.pavimentos||[]).map(pv => {
                            const k = pac.id + '_' + pv.nome
                            const ant = Math.min(acumAnt[k] || 0, 100)
                            const max = +(100 - ant).toFixed(2)
                            const pct = parseFloat(percentuais[k]) || 0
                            const val = pv.valor * (pct / 100)
                            return (
                              <div key={pv.nome} className="med-pav-row">
                                <div className="med-pav-name">{pv.nome}</div>
                                <div className="med-pav-orc">{fmt(pv.valor)}</div>
                                <div className="med-pav-pct">
                                  <input
                                    type="number" min="0" max={max} step="0.1" placeholder="0"
                                    value={percentuais[k] ?? ''}
                                    onChange={e => setPct(k, e.target.value, max)}
                                  />
                                  <span>%</span>
                                </div>
                                <div className="med-pav-acum">{ant > 0 ? `ant: ${ant.toFixed(1)}%` : ''}</div>
                                <div className="med-pav-val" style={{marginLeft:'auto',fontSize:'12px',color:'var(--accent2)',fontWeight:600,width:'110px',textAlign:'right',flexShrink:0}}>
                                  {pct > 0 ? fmt(val) : '—'}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'14px'}}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Voltar</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Calcular →</button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && resultado && (() => {
        const { totalMes, pctMes, catMap, detalhes } = resultado
        return (
          <div>
            <div className="resultado-box">
              <div className="r-title">Resultado — {fmtMes(mes)}</div>
              <div className="res-grid">
                <div className="res-stat hi">
                  <div className="rv">{fmt(totalMes)}</div>
                  <div className="rl">Medido este mês</div>
                </div>
                <div className="res-stat">
                  <div className="rv">{pctMes.toFixed(2)}%</div>
                  <div className="rl">% do orçamento (mês)</div>
                </div>
                <div className="res-stat gr">
                  <div className="rv">{pctMes.toFixed(2)}%</div>
                  <div className="rl">Acumulado após medição</div>
                </div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    {['Categoria','Medido R$','% da categ.'].map(h => (
                      <th key={h} style={{color:'#6b6660',fontSize:'10px',textTransform:'uppercase',letterSpacing:'.5px',padding:'6px 0',borderBottom:'1px solid #333',textAlign:'left'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{color:'#ccc'}}>
                  {Object.entries(catMap).map(([c, v]) => (
                    <tr key={c}>
                      <td style={{padding:'7px 0'}}>{c}</td>
                      <td>{fmt(v.val)}</td>
                      <td>{v.orc ? (v.val/v.orc*100).toFixed(2)+'%' : '—'}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{paddingTop:'12px',fontWeight:700,color:'#fff',fontSize:'14px'}}>TOTAL</td>
                    <td style={{paddingTop:'12px',fontWeight:700,color:'#f0b429'}}>{fmt(totalMes)}</td>
                    <td style={{paddingTop:'12px',fontWeight:700,color:'#f0b429'}}>{pctMes.toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <div style={{fontSize:'10px',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'12px',color:'var(--muted)'}}>
                Detalhe por pacote / pavimento
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Pacote</th><th>Pavimento</th><th>% Medido</th><th>Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhes.map((d, i) => (
                    <tr key={i}>
                      <td>{d.pacote_nome}</td>
                      <td>{d.pavimento_nome}</td>
                      <td><span className="badge b-warn">{d.pct.toFixed(1)}%</span></td>
                      <td>{fmt(d.val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',marginTop:'14px'}}>
              <button className="btn btn-ghost" onClick={() => setStep(3)}>← Corrigir</button>
              <button className="btn btn-success" onClick={salvarMedicao}>✓ Salvar Medição</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}