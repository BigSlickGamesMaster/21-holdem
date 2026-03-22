import axios from '../../axios'

export const getKycList = (params) => {
    return axios.get(`/KYC/list?size=${params.size}&eStatus=${params.eStatus}&pageNumber=${params.pageNumber}&search=${params.search}&sort=${params.sort}&orderBy=${params.orderBy}`)
}

export const getKycByID = (id) => {
    return axios.get(`/KYC/add/${id}`)
}

export const createKYCDetails = (data) => {
    return axios.post('/KYC/add', data)
}

export const updateKYCDetails = (data) => {
    return axios.put('/KYC/update', data)
}

export const updateKYCStatus = (data) => {
    return axios.patch('/KYC/update/status', data)
}

export const getKycPresignUrl = (data) => {
    return axios.post('/KYC/pre-sign-url', data)
}