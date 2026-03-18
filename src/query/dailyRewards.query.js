import axios from "../axios";

export async function getDailyRewards() {
    return await axios.get("/api/v1/daily_rewards");
}

export async function updateDailyRewards() {
    return await axios.post("/api/v1/daily_rewards/claim");
}
