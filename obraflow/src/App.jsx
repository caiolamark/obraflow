import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { LoginScreen } from './pages/LoginScreen'
import { Sidebar } from './components/Sidebar'
import { Obras } from './pages/Obras'
import { DetalheObra } from './pages/DetalheObra'
import { Medicao } from './pages/Medicao'
import { Historico } from './pages/Historico'
import { Comparativo } from './pages/Comparativo'
import { ResumoObra } from './pages/ResumoObra'
import { AppProvider } from './context/AppContext'

const STYLES = `
  @keyframes guindasteBalance {
    0%, 100% { transform: rotate(-1deg); }
    50%       { transform: rotate(1deg); }
  }
  @keyframes cargaDesce {
    0%   { transform: translateY(-32px); }
    60%  { transform: translateY(0px); }
    100% { transform: translateY(0px); }
  }
  @keyframes corrente {
    0%   { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -12; }
  }
  @keyframes predioSobe {
    0%   { transform: translateY(12px); opacity: 0; }
    100% { transform: translateY(0px);  opacity: 1; }
  }
  @keyframes piscaJanela {
    0%, 100% { opacity: 0.15; }
    50%      { opacity: 1; }
  }
  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fadeOutOverlay {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .guindaste-wrap {
    animation: guindasteBalance 2.4s ease-in-out infinite;
    transform-origin: 110px 9px;
  }
  .carga-wrap {
    animation: cargaDesce 1.2s ease-in-out forwards;
  }
  .corrente-line {
    stroke-dasharray: 4 2;
    animation: corrente 0.4s linear infinite;
  }
  .andar-1 { animation: predioSobe 0.4s ease forwards 0.1s; opacity: 0; }
  .andar-2 { animation: predioSobe 0.4s ease forwards 0.4s; opacity: 0; }
  .andar-3 { animation: predioSobe 0.4s ease forwards 0.7s; opacity: 0; }
  .janela  { animation: piscaJanela 1.4s ease-in-out infinite; }
  .janela:nth-child(2) { animation-delay: 0.3s; }
  .janela:nth-child(3) { animation-delay: 0.6s; }
  .janela:nth-child(4) { animation-delay: 0.9s; }

  .overlay-in  { animation: fadeInOverlay  0.18s ease forwards; }
  .overlay-out { animation: fadeOutOverlay 0.25s ease forwards; }

  .perfil-modal { animation: modalIn 0.2s ease forwards; }

  .avatar-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--accent); color: #fff;
    font-family: 'Bebas Neue', sans-serif; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; border: 2px solid transparent;
    transition: border-color .15s; overflow: hidden; flex-shrink: 0;
  }
  .avatar-btn:hover { border-color: var(--accent); }
  .avatar-btn img { width: 100%; height: 100%; object-fit: cover; }

  .foto-upload-area {
    width: 90px; height: 90px; border-radius: 50%;
    border: 2px dashed var(--border); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; transition: border-color .15s; margin: 0 auto 8px;
    background: var(--surface2);
  }
  .foto-upload-area:hover { border-color: var(--accent); }
  .foto-upload-area img { width: 100%; height: 100%; object-fit: cover; }
`

function ConstructionLoader({ fullscreen = false, fading = false }) {
  return (
    <div
      className={fading ? 'overlay-out' : 'overlay-in'}
      style={{
        position: 'fixed', inset: 0,
        backdropFilter: fullscreen ? 'none' : 'blur(6px)',
        WebkitBackdropFilter: fullscreen ? 'none' : 'blur(6px)',
        background: fullscreen ? 'var(--bg, #1a1814)' : 'rgba(26, 24, 20, 0.55)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '20px', zIndex: 999,
      }}
    >
      <style>{STYLES}</style>
      <svg viewBox="0 0 160 140" width="200" height="175" xmlns="http://www.w3.org/2000/svg">
        <rect x="0"  y="132" width="160" height="4" fill="#3a342e" rx="1"/>
        <rect x="10" y="130" width="140" height="4" fill="#2e2924" rx="1"/>
        <g className="andar-1">
          <rect x="12" y="106" width="68" height="24" fill="#3a342e" rx="1"/>
          <rect className="janela" x="18" y="111" width="10" height="12" fill="#f5a623" rx="1"/>
          <rect className="janela" x="34" y="111" width="10" height="12" fill="#f5a623" rx="1"/>
          <rect className="janela" x="50" y="111" width="10" height="12" fill="#f5a623" rx="1"/>
          <rect className="janela" x="64" y="111" width="10" height="12" fill="#f5a623" rx="1"/>
        </g>
        <g className="andar-2">
          <rect x="12" y="82" width="68" height="24" fill="#332e28" rx="1"/>
          <rect className="janela" x="18" y="87" width="10" height="12" fill="#f5a623" rx="1"/>
          <rect className="janela" x="34" y="87" width="10" height="12" fill="#f5a623" rx="1"/>
          <rect className="janela" x="50" y="87" width="10" height="12" fill="#f5a623" rx="1"/>
          <rect className="janela" x="64" y="87" width="10" height="12" fill="#f5a623" rx="1"/>
        </g>
        <g className="andar-3">
          <rect x="20" y="62" width="52" height="20" fill="#29241f" rx="1"/>
          <rect className="janela" x="26" y="67" width="10" height="10" fill="#f5a623" rx="1"/>
          <rect className="janela" x="42" y="67" width="10" height="10" fill="#f5a623" rx="1"/>
          <rect className="janela" x="56" y="67" width="10" height="10" fill="#f5a623" rx="1"/>
        </g>
        <g className="guindaste-wrap">
          <line x1="110" y1="130" x2="110" y2="20" stroke="#c8b89a" strokeWidth="5"/>
          <line x1="107" y1="130" x2="113" y2="110" stroke="#a89880" strokeWidth="1.5"/>
          <line x1="113" y1="130" x2="107" y2="110" stroke="#a89880" strokeWidth="1.5"/>
          <line x1="107" y1="110" x2="113" y2="90"  stroke="#a89880" strokeWidth="1.5"/>
          <line x1="113" y1="110" x2="107" y2="90"  stroke="#a89880" strokeWidth="1.5"/>
          <line x1="107" y1="90"  x2="113" y2="70"  stroke="#a89880" strokeWidth="1.5"/>
          <line x1="113" y1="90"  x2="107" y2="70"  stroke="#a89880" strokeWidth="1.5"/>
          <line x1="107" y1="70"  x2="113" y2="50"  stroke="#a89880" strokeWidth="1.5"/>
          <line x1="113" y1="70"  x2="107" y2="50"  stroke="#a89880" strokeWidth="1.5"/>
          <rect x="103" y="22" width="14" height="12" fill="#f5a623" rx="1"/>
          <rect x="105" y="24" width="5"  height="5"  fill="#1a1814" rx="1" opacity="0.5"/>
          <line x1="110" y1="20" x2="72"  y2="20" stroke="#c8b89a" strokeWidth="4"/>
          <line x1="110" y1="20" x2="150" y2="20" stroke="#c8b89a" strokeWidth="3"/>
          <line x1="110" y1="12" x2="74"  y2="20" stroke="#a89880" strokeWidth="1.5"/>
          <line x1="110" y1="12" x2="148" y2="20" stroke="#a89880" strokeWidth="1.5"/>
          <line x1="110" y1="20" x2="110" y2="10" stroke="#c8b89a" strokeWidth="3"/>
          <circle cx="110" cy="9" r="3" fill="#f5a623"/>
          <line x1="72" y1="20" x2="72" y2="62" className="corrente-line" stroke="#a89880" strokeWidth="2"/>
          <path d="M69,54 Q66,60 69,62 Q72,64 75,62 Q75,56 72,54" fill="none" stroke="#c8b89a" strokeWidth="2"/>
          <g className="carga-wrap">
            <rect x="26" y="40" width="46" height="22" fill="#3a342e" rx="2"/>
            <rect x="32" y="45" width="10" height="12" fill="#f5a623" rx="1" opacity="0.9"/>
            <rect x="48" y="45" width="10" height="12" fill="#f5a623" rx="1" opacity="0.7"/>
            <rect x="58" y="45" width="8"  height="12" fill="#f5a623" rx="1" opacity="0.5"/>
          </g>
        </g>
      </svg>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#f5a623', textTransform: 'uppercase', opacity: 0.8 }}>
        Carregando...
      </div>
    </div>
  )
}

function ModalPerfil({ sessao, onClose }) {
  const [perfil, setPerfil] = useState({ nome: '', empresa: '', funcao: '' })
  const [fotoUrl, setFotoUrl] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('perfis').select('*').eq('id', sessao.user.id).single()
      if (data) {
        setPerfil({ nome: data.nome || '', empresa: data.empresa || '', funcao: data.funcao || '' })
        if (data.foto_url) setFotoUrl(data.foto_url)
      }
    }
    carregar()
  }, [sessao])

  async function uploadFoto(file) {
    const ext = file.name.split('.').pop()
    const path = `avatars/${sessao.user.id}.${ext}`
    const { error } = await supabase.storage.from('perfis').upload(path, file, { upsert: true })
    if (error) { alert('Erro ao enviar foto: ' + error.message); return null }
    const { data } = supabase.storage.from('perfis').getPublicUrl(path)
    return data.publicUrl
  }

  async function salvar() {
    setSalvando(true); setMsg('')
    let foto = fotoUrl

    if (fileRef.current?.files[0]) {
      foto = await uploadFoto(fileRef.current.files[0])
      if (foto) setFotoUrl(foto)
    }

    const { error } = await supabase.from('perfis').upsert({
      id: sessao.user.id,
      nome: perfil.nome,
      empresa: perfil.empresa,
      funcao: perfil.funcao,
      foto_url: foto,
    })

    setSalvando(false)
    if (error) setMsg('Erro ao salvar: ' + error.message)
    else { setMsg('Salvo com sucesso!'); setTimeout(onClose, 1000) }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  const inicial = perfil.nome ? perfil.nome[0].toUpperCase() : sessao.user.email[0].toUpperCase()

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 500 }}>
      <div className="modal perfil-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="foto-upload-area" onClick={() => fileRef.current.click()}>
            {fotoUrl
              ? <img src={fotoUrl} alt="foto" />
              : <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '36px', color: 'var(--accent)' }}>{inicial}</div>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) setFotoUrl(URL.createObjectURL(e.target.files[0])) }} />
          <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1px' }}>
            Clique na foto para alterar
          </div>
        </div>

        <div className="fg">
          <label>Nome completo</label>
          <input value={perfil.nome} onChange={e => setPerfil({ ...perfil, nome: e.target.value })} placeholder="Seu nome" />
        </div>
        <div className="fg">
          <label>Empresa</label>
          <input value={perfil.empresa} onChange={e => setPerfil({ ...perfil, empresa: e.target.value })} placeholder="Sua empresa" />
        </div>
        <div className="fg">
          <label>Função / Cargo</label>
          <input value={perfil.funcao} onChange={e => setPerfil({ ...perfil, funcao: e.target.value })} placeholder="Ex: Engenheiro, Arquiteto..." />
        </div>

        {msg && (
          <div style={{ fontSize: '11px', color: msg.includes('Erro') ? 'var(--accent)' : 'var(--accent2)', marginBottom: '8px', textAlign: 'center' }}>
            {msg}
          </div>
        )}

        <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger btn-sm" onClick={sair}>Sair</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Topbar({ sessao, onAbrirPerfil }) {
  const [fotoUrl, setFotoUrl] = useState(null)
  const [nome, setNome] = useState('')

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('perfis').select('nome, foto_url').eq('id', sessao.user.id).single()
      if (data) { setNome(data.nome || ''); setFotoUrl(data.foto_url || null) }
    }
    carregar()
  }, [sessao])

  const inicial = nome ? nome[0].toUpperCase() : sessao.user.email[0].toUpperCase()

  return (
    <div className="topbar">
      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{nome || sessao.user.email}</div>
      <div className="avatar-btn" onClick={onAbrirPerfil}>
        {fotoUrl ? <img src={fotoUrl} alt="avatar" /> : inicial}
      </div>
    </div>
  )
}

function AppInner() {
  const [sessao, setSessao]   = useState(undefined)
  const [page, setPage]       = useState('obras')
  const [transitioning, setTransitioning] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSessao(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSessao(session))
    return () => subscription.unsubscribe()
  }, [])

  const navegar = useCallback((destino) => {
    if (destino === page || transitioning) return
    setTransitioning(true); setFadingOut(false)
    setTimeout(() => {
      setPage(destino)
      setFadingOut(true)
      setTimeout(() => { setTransitioning(false); setFadingOut(false) }, 280)
    }, 1000)
  }, [page, transitioning])

  if (sessao === undefined) return <ConstructionLoader fullscreen />
  if (!sessao) return <LoginScreen onLogin={() => {}} />

  return (
    <>
      <style>{STYLES}</style>
      <div className="shell">
        <Sidebar activePage={page} onNav={navegar} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Topbar sessao={sessao} onAbrirPerfil={() => setPerfilAberto(true)} />
          <div className="content" style={{ position: 'relative', flex: 1 }}>
            {page === 'obras'       && <Obras onNav={navegar} />}
            {page === 'detalhe'     && <DetalheObra onNav={navegar} />}
            {page === 'medicao'     && <Medicao onNav={navegar} />}
            {page === 'historico'   && <Historico />}
            {page === 'comparativo' && <Comparativo />}
            {page === 'resumo'      && <ResumoObra />}
            {transitioning && <ConstructionLoader fading={fadingOut} />}
          </div>
        </div>
      </div>
      {perfilAberto && (
        <ModalPerfil
          sessao={sessao}
          onClose={() => setPerfilAberto(false)}
        />
      )}
    </>
  )
}

function App() {
  return <AppProvider><AppInner /></AppProvider>
}

export default App