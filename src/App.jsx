import { useState, useEffect } from 'react'
import Cart from './components/Cart'

function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedGame, setSelectedGame] = useState('')
  const [selectedExpansion, setSelectedExpansion] = useState('')

  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3000/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Gagal koneksi ke server');
        return res.json()
      })
      .then(data => {
        setProducts(data)
        setLoading(false)
        
        if (data.length > 0) {
          const uniqueGames = [...new Set(data.map(p => p.game_name))];
          const initialGame = uniqueGames[0]; 
          setSelectedGame(initialGame);

          const expansionsForGame = data.filter(p => p.game_name === initialGame);
          const newestExp = expansionsForGame.find(p => p.is_newest === true);
          
          if (newestExp) {
            setSelectedExpansion(newestExp.expansion_name);
          } else {
            const exps = [...new Set(expansionsForGame.map(p => p.expansion_name))];
            setSelectedExpansion(exps[0]); 
          }
        }
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const uniqueGames = [...new Set(products.map(p => p.game_name))];
  
  let availableExpansions = selectedGame 
    ? [...new Set(products.filter(p => p.game_name === selectedGame).map(p => p.expansion_name))] 
    : [];

  availableExpansions.sort((a, b) => {
    const isANewest = products.find(p => p.game_name === selectedGame && p.expansion_name === a)?.is_newest;
    const isBNewest = products.find(p => p.game_name === selectedGame && p.expansion_name === b)?.is_newest;
    if (isANewest && !isBNewest) return -1; 
    if (!isANewest && isBNewest) return 1;  
    return a.localeCompare(b); 
  });

  const filteredProducts = products.filter(p => {
    return p.game_name === selectedGame && p.expansion_name === selectedExpansion;
  });

  const handleGameChange = (game) => {
    setSelectedGame(game);
    const expansionsForNewGame = products.filter(p => p.game_name === game);
    const newestExp = expansionsForNewGame.find(p => p.is_newest === true);
    if (newestExp) {
      setSelectedExpansion(newestExp.expansion_name);
    } else {
      const exps = [...new Set(expansionsForNewGame.map(p => p.expansion_name))];
      setSelectedExpansion(exps.length > 0 ? exps[0] : '');
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.qty >= product.stock) {
          alert(`Maaf, stok ${product.name} hanya tersisa ${product.stock}.`);
          return prevCart;
        }
        return prevCart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      } else {
        if (product.stock > 0) return [...prevCart, { ...product, qty: 1 }];
        else { alert("Maaf, stok habis!"); return prevCart; }
      }
    });
  };

  // FUNGSI BARU: Mengatur + dan - qty secara langsung
  const updateCartItemQty = (productId, newQty) => {
    if (newQty < 1) {
      removeFromCart(productId);
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (newQty > product.stock) {
      alert(`Maksimal stok tercapai. ${product.name} hanya tersedia ${product.stock} pcs.`);
      return;
    }

    setCart(prevCart => prevCart.map(item => 
      item.id === productId ? { ...item, qty: newQty } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const totalItems = cart.reduce((total, item) => total + item.qty, 0);
  const totalPrice = cart.reduce((total, item) => total + (item.price * item.qty), 0);

  if (loading) return <div style={{padding: '20px', textAlign: 'center'}}>Memuat koleksi kartu...</div>
  if (error) return <div style={{padding: '20px', color: 'red', textAlign: 'center'}}>Error: {error}</div>

  return (
    <div className="app-container">
      
      {/* Mengoper fungsi updateCartItemQty ke komponen Cart */}
      <Cart 
        cart={cart} 
        isCartOpen={isCartOpen} 
        setIsCartOpen={setIsCartOpen} 
        removeFromCart={removeFromCart} 
        updateCartItemQty={updateCartItemQty}
        totalPrice={totalPrice} 
      />

      <div className="header-nav">
        <button className="cart-button" onClick={() => setIsCartOpen(true)}>
          🛒 Cart {totalItems > 0 && <span style={{ backgroundColor: '#10b981', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{totalItems}</span>}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', letterSpacing: '-0.5px', fontWeight: '800' }}>Katalog Kartu TCG</h1>
        <p style={{ margin: '0 0 30px 0', color: '#666' }}>Temukan kartu incaranmu untuk melengkapi deck.</p>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {uniqueGames.map(game => (
            <button 
              key={game} onClick={() => handleGameChange(game)}
              style={{
                padding: '10px 24px', borderRadius: '30px', border: 'none',
                backgroundColor: selectedGame === game ? '#1a1a1a' : '#fff',
                color: selectedGame === game ? 'white' : '#555', cursor: 'pointer',
                fontWeight: selectedGame === game ? 'bold' : '600',
                boxShadow: selectedGame === game ? '0 4px 10px rgba(0,0,0,0.15)' : '0 2px 5px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease', fontSize: '15px'
              }}
            >
              {game}
            </button>
          ))}
        </div>
      </div>

      <div className="main-layout">
        <div className="sidebar">
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Set Ekspansi
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {availableExpansions.map(exp => (
              <button 
                key={exp} onClick={() => setSelectedExpansion(exp)}
                style={{
                  textAlign: 'left', padding: '10px 15px', borderRadius: '8px', border: 'none',
                  backgroundColor: selectedExpansion === exp ? '#f4f4f5' : 'transparent',
                  color: selectedExpansion === exp ? '#1a1a1a' : '#666', cursor: 'pointer',
                  fontWeight: selectedExpansion === exp ? '700' : '500', transition: 'all 0.1s',
                  fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                {exp}
                {selectedExpansion === exp && <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>}
              </button>
            ))}
          </div>
        </div>

        <div className="content-area"> 
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <p style={{ color: '#888', fontSize: '16px' }}>Belum ada kartu di set ini.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map(product => {
                
                // Cek apakah kartu ini sudah ada di cart
                const cartItem = cart.find(item => item.id === product.id);

                return (
                  <div key={product.id} style={{ 
                    display: 'flex', flexDirection: 'column', padding: '16px', backgroundColor: 'white',
                    borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}>
                    
                    <div style={{
                      width: '100%', aspectRatio: '3/4', borderRadius: '12px', marginBottom: '16px',
                      background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'inset 0 0 20px rgba(255,255,255,0.5)', maxHeight: '260px'
                    }}>
                      <span style={{ color: 'white', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.2)', fontSize: '14px' }}>Tampak Kartu</span>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', lineHeight: '1.3' }}>{product.name}</h3>
                      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#a1a1aa', fontFamily: 'monospace' }}>{product.card_code}</p>
                      <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '16px' }}>
                        <p style={{ margin: '4px 0' }}>Set: <strong>{product.expansion_name}</strong></p>
                        <p style={{ margin: '4px 0' }}>Stok: <strong>{product.stock}</strong></p>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '16px', marginTop: 'auto' }}>
                      <h2 style={{ margin: '0 0 12px 0', color: '#10b981', fontSize: '18px', fontWeight: '800' }}>
                        Rp {Number(product.price).toLocaleString('id-ID')}
                      </h2>
                      
                      {/* LOGIKA TOMBOL MODERN */}
                      {cartItem ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f4f4f5', borderRadius: '10px', padding: '4px' }}>
                          <button
                            onClick={() => updateCartItemQty(product.id, cartItem.qty - 1)}
                            style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', backgroundColor: 'white', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                          >-</button>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a1a' }}>{cartItem.qty} di Cart</span>
                          <button
                            onClick={() => updateCartItemQty(product.id, cartItem.qty + 1)}
                            style={{ width: '34px', height: '34px', borderRadius: '8px', border: 'none', backgroundColor: 'white', color: '#1a1a1a', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                          >+</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(product)} disabled={product.stock === 0}
                          style={{ 
                            width: '100%', padding: '10px', backgroundColor: product.stock === 0 ? '#d4d4d8' : '#18181b', 
                            color: 'white', border: 'none', borderRadius: '10px', 
                            cursor: product.stock === 0 ? 'not-allowed' : 'pointer', 
                            fontWeight: '600', fontSize: '13px', transition: 'background-color 0.2s ease'
                          }}
                        >
                          {product.stock === 0 ? 'Stok Habis' : 'Tambah ke Cart'}
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default App