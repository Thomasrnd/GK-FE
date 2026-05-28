import { useState, useEffect } from 'react';

export default function Cart({ cart, isCartOpen, setIsCartOpen, removeFromCart, updateCartItemQty, totalPrice }) {
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', province: '', city: '' });
  
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    if (isCheckoutStep) {
      fetch('http://localhost:3000/api/shipping/provinces')
        .then(res => res.json())
        .then(data => setProvinces(data))
        .catch(err => console.error("Error fetch provinces:", err));
    }
  }, [isCheckoutStep]);

  const handleProvinceChange = (e) => {
    const provId = e.target.value;
    setFormData(prev => ({ ...prev, province: provId, city: '' }));
    
    if (provId) {
      fetch(`http://localhost:3000/api/shipping/cities/${provId}`)
        .then(res => res.json())
        .then(data => setCities(data))
        .catch(err => console.error("Error fetch cities:", err));
    } else {
      setCities([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCloseCart = () => {
    setIsCartOpen(false);
    setTimeout(() => setIsCheckoutStep(false), 300);
  };

  const groupedCart = cart.reduce((acc, item) => {
    if (!acc[item.game_name]) acc[item.game_name] = [];
    acc[item.game_name].push(item);
    return acc;
  }, {});

  return (
    <div className={`cart-overlay ${isCartOpen ? 'open' : ''}`} onClick={(e) => { if (e.target.className.includes('cart-overlay')) handleCloseCart() }}>
      <div className="cart-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '22px' }}>{isCheckoutStep ? 'Detail Pengiriman' : 'Keranjang Belanja'}</h2>
          <button onClick={handleCloseCart} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888' }}>&times;</button>
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>Keranjangmu masih kosong.</div>
        ) : (
          <>
            {!isCheckoutStep ? (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.keys(groupedCart).map(gameName => (
                  <div key={gameName}>
                    <div style={{ backgroundColor: '#f4f4f5', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', color: '#52525b', textTransform: 'uppercase', marginBottom: '10px' }}>{gameName}</div>
                    {groupedCart[gameName].map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px dashed #eee', paddingBottom: '12px' }}>
                        <div style={{ width: '45px', height: '64px', background: '#e0c3fc', borderRadius: '6px' }}></div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{item.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => updateCartItemQty(item.id, item.qty - 1)} style={{ border: 'none', background: '#eee', padding: '2px 8px', borderRadius: '4px' }}>-</button>
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>{item.qty}</span>
                            <button onClick={() => updateCartItemQty(item.id, item.qty + 1)} style={{ border: 'none', background: '#eee', padding: '2px 8px', borderRadius: '4px' }}>+</button>
                          </div>
                          <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '14px' }}>Rp {Number(item.price * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '5px' }}>
                
                {/* Tambahan Input Nama & No HP sesuai style bawaan */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Nama Penerima</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Nomor Telepon</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Provinsi</label>
                  <select name="province" onChange={handleProvinceChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}>
                    <option value="">Pilih Provinsi</option>
                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Kota</label>
                  <select name="city" value={formData.city} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}>
                    <option value="">Pilih Kota</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600' }}>Alamat Lengkap</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}

            <div style={{ marginTop: 'auto', borderTop: '2px solid #eee', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
                <span>Total:</span>
                <span style={{ color: '#10b981' }}>Rp {Number(totalPrice).toLocaleString('id-ID')}</span>
              </div>
              {!isCheckoutStep ? (
                <button onClick={() => setIsCheckoutStep(true)} style={{ width: '100%', padding: '15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                  Lanjut Pengiriman
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setIsCheckoutStep(false)} style={{ flex: 1, padding: '15px', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Kembali</button>
                  <button style={{ flex: 2, padding: '15px', backgroundColor: '#18181b', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Pilih Kurir</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}