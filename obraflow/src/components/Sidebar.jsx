import logoImg from '../assets/logo.png';

export function Sidebar({ activePage, onNav }) {
  const items = [
    { id: 'obras',       icon: '🏗', label: 'Obras' },
    { id: 'medicao',     icon: '📋', label: 'Nova Medição' },
    { id: 'historico',   icon: '📅', label: 'Histórico' },
    { id: 'comparativo', icon: '📊', label: 'Comparativo' },
    { id: 'resumo',      icon: '📈', label: 'Resumo de Obra' },
  ]

  return (
    <div className="sidebar">
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid #2e2b26',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
        <img
          src={logoImg}
          alt="ObraFlow"
          style={{ width: '150px', height: 'auto', display: 'block' }}
        />
      </div>
      <nav className="nav">
        {items.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => onNav(item.id)}
          >
            <span className="ico">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">ObraFlow</div>
    </div>
  )
}