import { useState, useEffect } from 'react'
import Cart from './components/Cart'

const API = 'http://localhost:3000/api'

function App() {
  const [products, setProducts]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [selectedGame, setSelectedGame] = useState('')
  const [selectedExp, setSelectedExp]   = useState('')
  const [search, setSearch]             = useState('')
  const [cart, setCart]                 = useState([])
  const [isCartOpen, setIsCartOpen]     = useState(false)

  useEffect(() => {
    fetch(`${API}/products`)
      .then(res => { if (!res.ok) throw new Error('Gagal koneksi ke server'); return res.json() })
      .then(data => {
        setProducts(data)
        setLoading(false)
        if (data.length > 0) {
          const games = [...new Set(data.map(p => p.game_name))]
          const firstGame = games[0]
          setSelectedGame(firstGame)
          const expsForGame = data.filter(p => p.game_name === firstGame)
          const newest = expsForGame.find(p => p.is_newest)
          const exps = [...new Set(expsForGame.map(p => p.expansion_name))]
          setSelectedExp(newest ? newest.expansion_name : exps[0])
        }
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  // Derived
  const uniqueGames = [...new Set(products.map(p => p.game_name))]

  const availableExps = selectedGame
    ? [...new Set(products.filter(p => p.game_name === selectedGame).map(p => p.expansion_name))]
        .sort((a, b) => {
          const aNew = products.find(p => p.game_name === selectedGame && p.expansion_name === a)?.is_newest
          const bNew = products.find(p => p.game_name === selectedGame && p.expansion_name === b)?.is_newest
          if (aNew && !bNew) return -1
          if (!aNew && bNew) return 1
          return a.localeCompare(b)
        })
    : []

  const isNewest = (exp) =>
    !!products.find(p => p.game_name === selectedGame && p.expansion_name === exp && p.is_newest)

  const newestExpName = availableExps.find(e => isNewest(e))

  const filteredProducts = products.filter(p =>
    p.game_name === selectedGame &&
    p.expansion_name === selectedExp &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.card_code?.toLowerCase().includes(search.toLowerCase()))
  )

  // Game change
  const handleGameChange = (game) => {
    setSelectedGame(game)
    setSearch('')
    const exps = products.filter(p => p.game_name === game)
    const newest = exps.find(p => p.is_newest)
    const expNames = [...new Set(exps.map(p => p.expansion_name))]
    setSelectedExp(newest ? newest.expansion_name : expNames[0] || '')
  }

  // Cart
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.qty >= product.stock) { alert(`Stok ${product.name} hanya ${product.stock} pcs.`); return prev }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      if (product.stock <= 0) { alert('Stok habis!'); return prev }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateCartItemQty = (id, qty) => {
    if (qty < 1) { removeFromCart(id); return }
    const product = products.find(p => p.id === id)
    if (qty > product.stock) { alert(`Stok ${product.name} hanya ${product.stock} pcs.`); return }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const totalItems = cart.reduce((s, i) => s + i.qty, 0)
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px', background: '#050a1a' }}>
      <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '-1px', background: 'linear-gradient(180deg, #7dd3fc, #1e6fd9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GK</div>
      <div style={{ fontSize: '13px', color: '#3b5a85' }}>Memuat koleksi kartu...</div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fb7185', fontSize: '14px', background: '#050a1a' }}>
      {error}
    </div>
  )

  return (
    <div>
      <Cart
        cart={cart}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        removeFromCart={removeFromCart}
        updateCartItemQty={updateCartItemQty}
        totalPrice={totalPrice}
      />

      {/* ── NAV ── */}
      <nav className="gk-nav">
        <div className="gk-brand">
          <span className="gk-brand-mono">GK</span>
          <span className="gk-brand-tagline">goedang kartoe</span>
        </div>
        <button className="gk-cart-btn" onClick={() => setIsCartOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          Cart
          {totalItems > 0 && <span className="gk-cart-badge">{totalItems}</span>}
        </button>
      </nav>

      {/* ── HERO ── */}
      <div className="gk-hero">
        <div className="gk-hero-grid" />
        <div className="gk-hero-glow" />
        <div className="gk-hero-inner">
          <div>
            {selectedExp && isNewest(selectedExp) && (
              <div className="gk-hero-badge">◆ New Arrival</div>
            )}
            <h1>{selectedGame}{selectedExp ? <> · <span className="accent">{selectedExp}</span></> : ''}</h1>
            <p className="gk-hero-sub">Single card · Ready stock · Pengiriman ke seluruh Indonesia</p>
          </div>
        </div>
      </div>

      {/* ── GAME TABS ── */}
      <div className="gk-tabs">
        {uniqueGames.map((game, i) => (
          <span key={game} style={{ display: 'contents' }}>
            {i > 0 && <div className="gk-tab-divider" />}
            <button
              className={`gk-tab${selectedGame === game ? ' active' : ''}`}
              onClick={() => handleGameChange(game)}
            >
              {game}
            </button>
          </span>
        ))}
      </div>

      {/* ── LAYOUT: sidebar + content ── */}
      <div className="gk-layout">

        {/* ── EXPANSION SIDEBAR ── */}
        {availableExps.length > 0 && (
          <aside className="gk-sidebar">
            <div className="gk-sidebar-title">Set Ekspansi</div>
            <div className="gk-exp-list">
              {availableExps.map(exp => (
                <button
                  key={exp}
                  className={`gk-exp-item${selectedExp === exp ? ' active' : ''}`}
                  onClick={() => { setSelectedExp(exp); setSearch('') }}
                >
                  <span>{exp}</span>
                  {isNewest(exp) && <span className="gk-exp-new-badge">New</span>}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* ── CONTENT ── */}
        <div className="gk-content">
        <div className="gk-content-header">
          <span className="gk-count">
            {filteredProducts.length} kartu{selectedExp ? ` · ${selectedExp}` : ''}
          </span>
          <input
            className="gk-search"
            placeholder="Cari nama / card code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="gk-empty">
            {search ? `Tidak ada kartu dengan kata kunci "${search}"` : 'Belum ada kartu di set ini.'}
          </div>
        ) : (
          <div className="gk-grid">
            {filteredProducts.map(product => {
              const cartItem = cart.find(i => i.id === product.id)
              const isLow = product.stock > 0 && product.stock <= 5
              const isOut = product.stock === 0

              return (
                <div key={product.id} className="gk-card" style={{ opacity: isOut ? 0.6 : 1 }}>
                  <div className="gk-card-img">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        onError={e => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.gk-card-placeholder').style.display = 'flex' }}
                      />
                    ) : null}
                    <div className="gk-card-placeholder" style={{ display: product.image_url ? 'none' : 'flex' }}>
                      <span>Tampak Kartu</span>
                    </div>
                    {isLow && (
                      <div className="gk-badge-low">Sisa {product.stock}</div>
                    )}
                  </div>

                  <div className="gk-card-body">
                    <div className="gk-card-name">{product.name}</div>
                    {product.card_code && <div className="gk-card-code">{product.card_code}</div>}
                    <div className={`gk-card-stock${isLow ? ' low' : ''}`}>
                      {isOut ? 'Stok habis' : isLow ? `Hampir habis!` : `Stok: ${product.stock}`}
                    </div>
                    <div className="gk-card-footer">
                      <div className="gk-card-price">
                        Rp {Number(product.price).toLocaleString('id-ID')}
                      </div>
                      {isOut ? (
                        <button className="gk-out-btn" disabled>Habis</button>
                      ) : cartItem ? (
                        <div className="gk-qty">
                          <button className="gk-qty-btn" onClick={() => updateCartItemQty(product.id, cartItem.qty - 1)}>−</button>
                          <span className="gk-qty-num">{cartItem.qty}</span>
                          <button className="gk-qty-btn" onClick={() => updateCartItemQty(product.id, cartItem.qty + 1)}>+</button>
                        </div>
                      ) : (
                        <button className="gk-add-btn" onClick={() => addToCart(product)}>+</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default App