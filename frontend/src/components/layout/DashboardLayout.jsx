import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:3000"; // your backend URL

export default function Offers() {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((res) => res.json())
      .then((data) => setOffers(data))
      .catch((err) => console.error("Error loading offers:", err));
  }, []);

  const handleClick = (id) => {
    // redirect through tracking route
    window.location.href = `${API_URL}/click/${id}`;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Available Offers</h1>

      <div style={styles.grid}>
        {offers.map((offer) => (
          <div key={offer.id} style={styles.card}>
            <img
              src={offer.image || "https://via.placeholder.com/200"}
              alt={offer.name}
              style={styles.image}
            />

            <h3>{offer.name}</h3>
            <p>{offer.description}</p>

            <button style={styles.button} onClick={() => handleClick(offer.id)}>
              View Offer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#1e293b",
    padding: "15px",
    borderRadius: "10px",
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: "160px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  button: {
    marginTop: "10px",
    padding: "10px 15px",
    background: "#3b82f6",
    border: "none",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
  },
};
