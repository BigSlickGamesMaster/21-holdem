import axios from "../axios";

export async function getProfile() {
    return await axios.get("/api/v1/profile");
}

export async function updateProfile(data) {
    return await axios.post("/api/v1/profile/update", data);
}
