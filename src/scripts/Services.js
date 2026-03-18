import axios from "axios";

export default class Services {
    constructor({ sRoot, authorization }) {
        this.sRoot = sRoot;
        this.authorization = authorization;
    }
    async profile() {
        return await axios.get(`${this.sRoot}/api/v1/profile`, { headers: { authorization: this.authorization } });
    }

    async setting({ bSoundEnabled = true, bMusicEnabled = true }) {
        return await axios.post(`${this.sRoot}/api/v1/profile/setting`, {
            bSoundEnabled: bSoundEnabled,
            bMusicEnabled: bMusicEnabled,
        }, { headers: { authorization: this.authorization } });
    }

    async pauseGuestBoard() {
        return await axios.post(`${this.sRoot}/api/v1/poker/guest/board/pause`, {}, { headers: { authorization: this.authorization } });
    }

    async resumeGuestBoard() {
        return await axios.post(`${this.sRoot}/api/v1/poker/guest/board/resume`, {}, { headers: { authorization: this.authorization } });
    }
}
