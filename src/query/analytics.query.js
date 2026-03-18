import axios from "../axios";

export async function updateAnalytics(nInAppTime) {
    return await axios.get("/api/v1/analytics", { params: { nInAppTime } });
}
