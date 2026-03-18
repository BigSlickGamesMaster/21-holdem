import axios from "../axios";

// Get shop items
export async function getChips() {
  return await axios.get("/api/v1/shop");
}

// Start checkout session
export async function buyChips(data) {
  return await axios.post("/api/v1/shop/buy", data);
}

// ✅ Confirm payment (called after redirect back from Stripe)
export async function confirmPayment({ session_id }) {
  return await axios.get(`/api/v1/shop/confirm?session_id=${session_id}`);
}
