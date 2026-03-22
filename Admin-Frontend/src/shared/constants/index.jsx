/* eslint-disable no-useless-escape */
export const ONLY_NUMBER = /^[0-9]*$/
export const EMAIL = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?$/
export const PASSWORD = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-])/
// export const URL_REGEX = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/
export const URL_REGEX = /^(https?:\/\/)(localhost|[\w.-]+(?:\.[\w\.-]+)+)([\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=]*)$/

export const URL2 = /^(https?:\/\/)?([^\s:\/]+(?:\.[^\s:\/]+)*\.[a-z]{2,}(?::(?![1-9])\d{2,5})?)(\/[^\s]*)?$/
export const MainURL = /^(?:https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s:]{2,}(?::\d+)?(?:\/[^\s]*)?(?:\/?[^\s#]*)?(?:#[^\s]*)?|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s:]{2,}(?::\d+)?(?:\/[^\s]*)?(?:\/?[^\s#]*)?(?:#[^\s]*)?)$/