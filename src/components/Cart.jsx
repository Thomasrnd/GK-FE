import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL;

// Berat per kartu dalam gram (asumsi)
const WEIGHT_PER_CARD = 5;

export default function Cart({ cart, isCartOpen, setIsCartOpen, removeFromCart, updateCartItemQty, totalPrice, clearCart }) {
  // Step: 'cart' | 'shipping' | 'courier' | 'summary'
  const [step, setStep] = useState('cart');

  const [formData, setFormData] = useState({ name: '', phone: '', address: '', note: '' });

  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [couriers, setCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [loadingCourier, setLoadingCourier] = useState(false);
  const [courierError, setCourierError] = useState('');

  // Fetch provinsi saat masuk step shipping
  useEffect(() => {
    if (step === 'shipping' && provinces.length === 0) {
      fetch(`${API}/shipping/provinces`)
        .then(res => res.json())
        .then(data => setProvinces(data))
        .catch(() => {});
    }
  }, [step]);

  const handleProvinceChange = (e) => {
    const id = e.target.value;
    setSelectedProvince(id);
    setSelectedCity('');
    setSelectedDistrict('');
    setCities([]);
    setDistricts([]);
    if (id) {
      fetch(`${API}/shipping/cities/${id}`)
        .then(res => res.json())
        .then(data => setCities(data))
        .catch(() => {});
    }
  };

  const handleCityChange = (e) => {
    const id = e.target.value;
    setSelectedCity(id);
    setSelectedDistrict('');
    setDistricts([]);
    if (id) {
      fetch(`${API}/shipping/districts/${id}`)
        .then(res => res.json())
        .then(data => setDistricts(data))
        .catch(() => {});
    }
  };

  const totalWeight = cart.reduce((sum, item) => sum + item.qty * WEIGHT_PER_CARD, 0);
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleFetchCouriers = () => {
    if (!selectedDistrict) return;
    setLoadingCourier(true);
    setCourierError('');
    setCouriers([]);
    setSelectedCourier(null);

    fetch(`${API}/shipping/cost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: selectedDistrict,
        weight: totalWeight,
        courier: 'jne:sicepat:jnt',
        price: 'lowest'
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          setCourierError('Tidak ada layanan kurir tersedia ke tujuan ini.');
        } else {
          setCouriers(data);
          setStep('courier');
        }
      })
      .catch(() => setCourierError('Gagal mengambil data kurir. Coba lagi.'))
      .finally(() => setLoadingCourier(false));
  };

  const handleSelectCourier = (courier) => {
    setSelectedCourier(courier);
    setStep('summary');
  };

  const handleCloseCart = () => {
    const wasDone = step === 'done';
    setIsCartOpen(false);
    setTimeout(() => {
      setStep('cart');
      setSelectedCourier(null);
      setCouriers([]);
      setOrderId(null);
      setOrderCode(null);
      setProofFile(null);
      setOrderError('');
      if (wasDone && clearCart) clearCart();
    }, 300);
  };

  const handleBack = () => {
    if (step === 'summary') setStep('courier');
    else if (step === 'courier') setStep('shipping');
    else if (step === 'shipping') setStep('cart');
  };

  const isShippingValid = formData.name.trim() && formData.phone.trim() && selectedDistrict && formData.address.trim();

  // WhatsApp order
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [orderCode, setOrderCode] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [proofFile, setProofFile] = useState(null);

  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    setOrderError('');

    const provinceName = provinces.find(p => p.id == selectedProvince)?.name || '';
    const cityName     = cities.find(c => c.id == selectedCity)?.name || '';
    const districtName = districts.find(d => d.id == selectedDistrict)?.name || '';
    const grandTotal   = totalPrice + selectedCourier.cost;

    try {
      const response = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:   formData.name,
          phone_number:    formData.phone,
          address:         formData.address,
          province:        provinceName,
          city:            cityName,
          district:        districtName,
          note:            formData.note || null,
          courier_name:    selectedCourier.courier_name,
          courier_service: selectedCourier.service,
          shipping_cost:   selectedCourier.cost,
          total_price:     grandTotal,
          items: cart.map(item => ({
            product_id:     item.id,
            quantity:       item.qty,
            price_at_time:  item.price
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat pesanan');

      setOrderId(data.order_id);
      setOrderCode(data.order_code);
      // Ambil daftar rekening aktif untuk ditampilkan
      const banks = await fetch(`${API}/bank-accounts`).then(r => r.json()).catch(() => []);
      setBankAccounts(banks);
      setStep('payment');

    } catch (err) {
      setOrderError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile) { setOrderError('Pilih file bukti transfer dulu'); return; }
    setIsSubmitting(true);
    setOrderError('');
    try {
      const fd = new FormData();
      fd.append('proof', proofFile);
      const res = await fetch(`${API}/orders/${orderId}/payment-proof`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal upload bukti');
      setStep('done');
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedCart = cart.reduce((acc, item) => {
    if (!acc[item.game_name]) acc[item.game_name] = [];
    acc[item.game_name].push(item);
    return acc;
  }, {});

  const stepTitles = {
    cart: 'Keranjang Belanja',
    shipping: 'Detail Pengiriman',
    courier: 'Pilih Kurir',
    summary: 'Ringkasan Pesanan',
    payment: 'Pembayaran',
    done: 'Pesanan Diterima'
  };

  const stepNumbers = { cart: 1, shipping: 2, courier: 3, summary: 4 };

  return (
    <div
      className={`cart-overlay ${isCartOpen ? 'open' : ''}`}
      onClick={(e) => { if (e.target.className.includes?.('cart-overlay')) handleCloseCart(); }}
    >
      <div className="cart-panel">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{stepTitles[step]}</h2>
            {/* Step indicator */}
            {(step === 'shipping' || step === 'courier' || step === 'summary') && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                {['shipping', 'courier', 'summary'].map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: '700',
                      backgroundColor: stepNumbers[step] >= stepNumbers[s] ? '#1456b0' : '#e4e4e7',
                      color: stepNumbers[step] >= stepNumbers[s] ? 'white' : '#a1a1aa'
                    }}>{i + 1}</div>
                    {i < 2 && <div style={{ width: '18px', height: '2px', backgroundColor: stepNumbers[step] > stepNumbers[s] ? '#1456b0' : '#e4e4e7', borderRadius: '2px' }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleCloseCart} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#888', lineHeight: 1 }}>&times;</button>
        </div>

        <div style={{ borderBottom: '1px solid #f0f0f0', marginBottom: '20px' }} />

        {/* ── STEP: CART ── */}
        {step === 'cart' && (
          <>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: '60px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
                <p style={{ margin: 0 }}>Keranjangmu masih kosong.</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {Object.keys(groupedCart).map(gameName => (
                    <div key={gameName}>
                      <div style={{ backgroundColor: '#f4f4f5', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>{gameName}</div>
                      {groupedCart[gameName].map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: '12px', paddingBottom: '14px', marginBottom: '14px', borderBottom: '1px dashed #f0f0f0' }}>
                          <div style={{ width: '45px', height: '64px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #dde6f2, #c5d6ec)' }}>
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                onError={e => { e.target.style.display = 'none' }}
                              />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', lineHeight: 1.3 }}>{item.name}</h4>
                            <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#a1a1aa' }}>{item.expansion_name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button onClick={() => updateCartItemQty(item.id, item.qty - 1)} style={{ width: '26px', height: '26px', border: 'none', background: '#f4f4f5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                                <button onClick={() => updateCartItemQty(item.id, item.qty + 1)} style={{ width: '26px', height: '26px', border: 'none', background: '#f4f4f5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                              </div>
                              <span style={{ fontWeight: '800', color: '#1456b0', fontSize: '14px' }}>Rp {Number(item.price * item.qty).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '2px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#71717a' }}>
                    <span>{totalQty} kartu · {totalWeight}g</span>
                    <span>Subtotal</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '20px', fontWeight: '800' }}>
                    <span>Total</span>
                    <span style={{ color: '#1456b0' }}>Rp {Number(totalPrice).toLocaleString('id-ID')}</span>
                  </div>
                  <button onClick={() => setStep('shipping')} style={{ width: '100%', padding: '15px', backgroundColor: '#1456b0', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>
                    Lanjut ke Pengiriman →
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── STEP: SHIPPING ── */}
        {step === 'shipping' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '2px' }}>

              {[
                { label: 'Nama Penerima', key: 'name', type: 'text', placeholder: 'Nama lengkap' },
                { label: 'Nomor Telepon', key: 'phone', type: 'tel', placeholder: '08xx-xxxx-xxxx' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type={type} placeholder={placeholder} value={formData[key]}
                    onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}

              <div>
                <label style={labelStyle}>Provinsi</label>
                <select value={selectedProvince} onChange={handleProvinceChange} style={inputStyle}>
                  <option value="">Pilih Provinsi</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Kota / Kabupaten</label>
                <select value={selectedCity} onChange={handleCityChange} disabled={!selectedProvince} style={{ ...inputStyle, opacity: !selectedProvince ? 0.5 : 1 }}>
                  <option value="">Pilih Kota</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Kecamatan</label>
                <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} disabled={!selectedCity} style={{ ...inputStyle, opacity: !selectedCity ? 0.5 : 1 }}>
                  <option value="">Pilih Kecamatan</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Alamat Lengkap</label>
                <textarea
                  placeholder="Nama jalan, nomor rumah, RT/RW, dll"
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Catatan (opsional)</label>
                <input
                  type="text" placeholder="Contoh: Titip di pos satpam"
                  value={formData.note}
                  onChange={e => setFormData(p => ({ ...p, note: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {courierError && (
                <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', color: '#e11d48', fontSize: '13px' }}>
                  {courierError}
                </div>
              )}
            </div>

            <div style={{ paddingTop: '16px', borderTop: '2px solid #f0f0f0', marginTop: 'auto', display: 'flex', gap: '10px' }}>
              <button onClick={handleBack} style={backBtnStyle}>← Kembali</button>
              <button
                onClick={handleFetchCouriers}
                disabled={!isShippingValid || loadingCourier}
                style={{ ...primaryBtnStyle, flex: 2, opacity: (!isShippingValid || loadingCourier) ? 0.5 : 1 }}
              >
                {loadingCourier ? 'Mencari kurir...' : 'Cek Ongkir →'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: COURIER ── */}
        {step === 'courier' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#71717a' }}>
                Total berat: <strong>{totalWeight}g</strong> · Tujuan: <strong>{districts.find(d => d.id == selectedDistrict)?.name}</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {couriers.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectCourier(c)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px', borderRadius: '12px', border: '2px solid #f0f0f0',
                      backgroundColor: 'white', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1456b0'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f0f0'}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', textTransform: 'uppercase' }}>{c.courier_name}</div>
                      <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>{c.service} · {c.etd}</div>
                    </div>
                    <div style={{ fontWeight: '800', color: '#1456b0', fontSize: '16px', flexShrink: 0 }}>
                      Rp {Number(c.cost).toLocaleString('id-ID')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '2px solid #f0f0f0', marginTop: 'auto' }}>
              <button onClick={handleBack} style={{ ...backBtnStyle, width: '100%' }}>← Ubah Alamat</button>
            </div>
          </>
        )}

        {/* ── STEP: SUMMARY ── */}
        {step === 'summary' && selectedCourier && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Info penerima */}
              <SummarySection title="📦 Penerima">
                <SummaryRow label="Nama" value={formData.name} />
                <SummaryRow label="No HP" value={formData.phone} />
                <SummaryRow label="Alamat" value={`${formData.address}, Kec. ${districts.find(d => d.id == selectedDistrict)?.name}, ${cities.find(c => c.id == selectedCity)?.name}`} />
                {formData.note && <SummaryRow label="Catatan" value={formData.note} />}
              </SummarySection>

              {/* Info kurir */}
              <SummarySection title="🚚 Pengiriman">
                <SummaryRow label="Kurir" value={`${selectedCourier.courier_name} - ${selectedCourier.service}`} />
                <SummaryRow label="Estimasi" value={selectedCourier.etd} />
                <SummaryRow label="Ongkir" value={`Rp ${Number(selectedCourier.cost).toLocaleString('id-ID')}`} bold />
              </SummarySection>

              {/* Daftar item */}
              <SummarySection title="🃏 Pesanan">
                {cart.map(item => (
                  <SummaryRow key={item.id} label={`${item.name} x${item.qty}`} value={`Rp ${Number(item.price * item.qty).toLocaleString('id-ID')}`} />
                ))}
              </SummarySection>

              {/* Grand total */}
              <div style={{ backgroundColor: '#eef4fc', border: '1px solid #c5dbf5', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: '700' }}>Grand Total</span>
                  <span style={{ fontSize: '22px', fontWeight: '900', color: '#1456b0' }}>
                    Rp {Number(totalPrice + selectedCourier.cost).toLocaleString('id-ID')}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#52525b' }}>
                  (Subtotal Rp {Number(totalPrice).toLocaleString('id-ID')} + Ongkir Rp {Number(selectedCourier.cost).toLocaleString('id-ID')})
                </p>
              </div>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '2px solid #f0f0f0', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orderError && (
                <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', color: '#e11d48', fontSize: '13px' }}>
                  {orderError}
                </div>
              )}
              <button
                onClick={handleCreateOrder}
                disabled={isSubmitting}
                style={{ ...primaryBtnStyle, fontSize: '15px', padding: '16px', opacity: isSubmitting ? 0.6 : 1 }}
              >
                {isSubmitting ? 'Memproses...' : 'Buat Pesanan →'}
              </button>
              <button onClick={handleBack} disabled={isSubmitting} style={backBtnStyle}>← Ganti Kurir</button>
            </div>
          </>
        )}

        {/* ── STEP: PAYMENT ── */}
        {step === 'payment' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#eef4fc', border: '1px solid #c5dbf5', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#52525b' }}>Order ID</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1456b0' }}>{orderCode}</div>
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#52525b' }}>Total yang harus dibayar</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#1456b0' }}>
                  Rp {Number(totalPrice + selectedCourier.cost).toLocaleString('id-ID')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Transfer ke salah satu rekening:</div>
                {bankAccounts.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#a1a1aa' }}>Belum ada rekening tersedia. Hubungi penjual.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {bankAccounts.map(bank => (
                      <div key={bank.id} style={{ border: '1px solid #e4e4e7', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '800' }}>{bank.bank_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <span style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: '700', letterSpacing: '0.5px' }}>{bank.account_number}</span>
                          <button
                            onClick={() => navigator.clipboard?.writeText(bank.account_number)}
                            style={{ fontSize: '11px', padding: '4px 10px', border: '1px solid #e4e4e7', borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#1456b0', fontWeight: '600' }}
                          >
                            Salin
                          </button>
                        </div>
                        <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>a.n. {bank.account_holder}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Upload bukti transfer</div>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: `2px dashed ${proofFile ? '#1456b0' : '#d8dde6'}`, borderRadius: '10px',
                  padding: '24px', cursor: 'pointer', backgroundColor: '#fafafa', textAlign: 'center',
                }}>
                  <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files[0])} style={{ display: 'none' }} />
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>📎</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: proofFile ? '#1456b0' : '#52525b' }}>
                    {proofFile ? proofFile.name : 'Klik untuk pilih foto bukti'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>JPG, PNG, max 5MB</div>
                </label>
              </div>

              {orderError && (
                <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', color: '#e11d48', fontSize: '13px' }}>
                  {orderError}
                </div>
              )}
            </div>

            <div style={{ paddingTop: '16px', borderTop: '2px solid #f0f0f0', marginTop: 'auto' }}>
              <button
                onClick={handleUploadProof}
                disabled={isSubmitting || !proofFile}
                style={{ ...primaryBtnStyle, width: '100%', fontSize: '15px', padding: '16px', opacity: (isSubmitting || !proofFile) ? 0.5 : 1 }}
              >
                {isSubmitting ? 'Mengupload...' : 'Kirim Bukti Transfer'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP: DONE ── */}
        {step === 'done' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#eef4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '20px' }}>✓</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Bukti Terkirim!</h2>
            <p style={{ fontSize: '14px', color: '#52525b', lineHeight: 1.5, marginBottom: '6px' }}>
              Pesanan <strong>{orderCode}</strong> sedang menunggu konfirmasi pembayaran dari penjual.
            </p>
            <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5 }}>
              Kami akan memproses pesananmu setelah pembayaran diverifikasi.
            </p>
            <div style={{ width: '100%' }}>
              <button onClick={handleCloseCart} style={{ width: '100%', padding: '14px', marginTop: '28px', fontSize: '15px', backgroundColor: '#1456b0', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
                Selesai
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Reusable mini components ──

function SummarySection({ title, children }) {
  return (
    <div style={{ backgroundColor: '#fafafa', borderRadius: '12px', padding: '14px 16px', border: '1px solid #f0f0f0' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#52525b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
      <span style={{ color: '#71717a', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: bold ? '700' : '500', textAlign: 'right', color: '#1a1a1a' }}>{value}</span>
    </div>
  );
}

// ── Shared styles ──
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#3f3f46', display: 'block', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const backBtnStyle = { flex: 1, padding: '13px', border: '1px solid #e4e4e7', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', backgroundColor: 'white', color: '#3f3f46' };
const primaryBtnStyle = { flex: 2, padding: '13px', backgroundColor: '#1456b0', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' };