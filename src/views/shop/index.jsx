import {
  chips1,
  chips2,
  chips3,
  chips4,
  chips5,
} from "assets/images/shop/shop";
import { buyChips, getChips, confirmPayment } from "query/shop.query"; // ⬅️ add confirmPayment
import React, { useEffect } from "react";
import { Button } from "react-bootstrap";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { ReactToastify } from "shared/utils";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  "pk_live_51RKUWDCjGp9Y7z5pfEw3AFjBJPli82C2xV3NJLsSwl0KBdRlhfDJg4u5qLX9GKZmbfb6nKYc6jljLeZ3yxTPnn1M00FddDWVLA"
);

const Shop = () => {
  const queryClient = useQueryClient();

  // Get shop data
  const { data: getChipsData } = useQuery("getChips", getChips, {
    select: (data) => data?.data?.data,
  });

  // Start checkout session
  const { mutate: mutateBuyChips } = useMutation(buyChips, {
    onSuccess: async (response) => {
      const payload = response?.data;
      if (payload?.status === 200 && payload?.data?.sessionId) {
        const stripe = await stripePromise;
        const { error } = await stripe.redirectToCheckout({
          sessionId: payload.data.sessionId,
        });
        if (error) {
          ReactToastify(error.message || "Stripe redirect failed", "error");
        }
      } else {
        ReactToastify(payload?.message || "Something went wrong", "error");
      }
    },
    onError: (error) => {
      ReactToastify(
        error?.response?.data?.message || "Payment failed",
        "error"
      );
    },
  });

  // Confirm payment after redirect
  const { mutate: mutateConfirmPayment } = useMutation(confirmPayment, {
    onSuccess: (response) => {
      const payload = response?.data;
      if (payload?.status === 200) {
        ReactToastify("Payment successful! Chips added.", "success");
        queryClient.invalidateQueries("profileData");
      } else {
        ReactToastify(payload?.message || "Payment confirmation failed", "error");
      }
    },
    onError: (error) => {
      ReactToastify(
        error?.response?.data?.message || "Payment confirmation failed",
        "error"
      );
    },
  });

  const coinImage = (chip) => {
    if (chip <= 100) return chips1;
    if (chip <= 500) return chips2;
    if (chip <= 1000) return chips3;
    if (chip <= 2500) return chips4;
    return chips5;
  };

  const handleBuyChips = (nPrice) => {
    mutateBuyChips({ nPrice });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") && params.get("session_id")) {
      const sessionId = params.get("session_id");
      mutateConfirmPayment({ session_id: sessionId });
      window.history.replaceState({}, document.title, "/shop");
    }
    if (params.get("cancel")) {
      ReactToastify("Payment cancelled.", "error");
      window.history.replaceState({}, document.title, "/shop");
    }
  }, [mutateConfirmPayment]);

  return (
    <div className="shop-chip-page">
      <div className="shop-chip-header">Shop</div>
      <div className="shop-chip-content">
        <div className="shop-chip-list">
          {getChipsData?.map((chip, index) => (
            <div key={index} className="shop-chip-items">
              {chip?.nChips === 10000 && <div className="tag">Best Value</div>}
              <div className="icon">
                <img src={coinImage(chip?.nChips)} alt="" />
              </div>
              <div className="chip-amount-text">{chip?.nChips} chips</div>
              <Button
                className="buy-chips"
                onClick={() => handleBuyChips(chip?.nPrice)}
              >
                ${chip?.nPrice}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Shop;
