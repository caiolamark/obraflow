import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logoImg from '../assets/logo.png'

export function LoginScreen({ onLogin }) {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar() {
    setErro(''); setSucesso('')
    if (!email || !senha) { setErro('Preencha email e senha.'); return }
    if (modo === 'cadastrar' && !nome) { setErro('Informe seu nome.'); return }
    setLoading(true)

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro('Email ou senha incorretos.')
      else onLogin()
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: senha })
      if (error) {
        setErro(error.message)
      } else if (data?.user) {
        await supabase.from('perfis').insert([{ id: data.user.id, nome }])
        setSucesso('Conta criada! Faça login para continuar.')
        setModo('entrar')
        setSenha('')
      }
    }
    setLoading(false)
  }

  return (
    <div id="login-screen">
      <div className="login-box">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <img
            src={logoImg}
            alt="ObraFlow"
            style={{ width: '180px', height: 'auto', display: 'block' }}
          />
        </div>
        <div className="login-sub">Controle de Medições</div>

        <div className="login-tabs">
          <button className={`login-tab${modo === 'entrar' ? ' active' : ''}`}
            onClick={() => { setModo('entrar'); setErro(''); setSucesso('') }}>
            Entrar
          </button>
          <button className={`login-tab${modo === 'cadastrar' ? ' active' : ''}`}
            onClick={() => { setModo('cadastrar'); setErro(''); setSucesso('') }}>
            Cadastrar
          </button>
        </div>

        {modo === 'cadastrar' && (
          <div className="fg">
            <label>Nome completo</label>
            <input type="text" placeholder="Ex: Caio Lamark"
              value={nome} onChange={e => setNome(e.target.value)} />
          </div>
        )}

        <div className="fg">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        </div>

        <div className="fg">
          <label>Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && entrar()} />
        </div>

        {erro && <div className="login-err">{erro}</div>}
        {sucesso && <div className="login-err" style={{ color: 'var(--accent2)' }}>{sucesso}</div>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={entrar} disabled={loading}>
          {loading ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </div>
    </div>
  )
}