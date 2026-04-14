import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [obras, setObras] = useState([])
  const [obraAtiva, setObraAtiva] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  async function carregarObras() {
    const { data } = await supabase.from('obras').select('*')
    setObras(data || [])
  }

  return (
    <AppContext.Provider value={{ obras, setObras, obraAtiva, setObraAtiva, user, setUser, carregarObras }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}