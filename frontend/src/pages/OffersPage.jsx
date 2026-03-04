import React, { useEffect, useState } from "react";
import { api } from '../services/api';

export default function OffersPage() {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    api.get('/products')
      .then((resp) => {
        const data = resp.data;
        const arr = Array.isArray(data) ? data : (data?.products || data?.offers || []);
        setOffers(arr);
      })
      .catch((err) => console.error("Error loading offers:", err));
  }, []);

  const handleClick = (id) => {
    window.location.href = `${API_URL}/click/${id}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Available Offers</h1>
        <div>
          <select id="lang-select" defaultValue={localStorage.getItem('locale') || 'en'} onChange={(e) => { localStorage.setItem('locale', e.target.value); window.location.reload(); }}>
            <option value="en">EN</option>
            <option value="fr">FR</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {Array.isArray(offers) ? (
          offers.map((offer) => (
            <div key={offer.id} style={{ background: '#1e293b', padding: 15, borderRadius: 10, textAlign: 'center' }}>
              <img src={offer.image || 'https://via.placeholder.com/200'} alt={offer.name} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
              <h3>{offer.name}</h3>
              <p>{offer.description}</p>
              <button style={{ marginTop: 10, padding: '10px 15px', background: '#3b82f6', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }} onClick={() => handleClick(offer.id)}>
                View Offer
              </button>
            </div>
          ))
        ) : null}
      </div>
    </div>
  );
}
