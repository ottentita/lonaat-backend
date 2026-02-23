import React, { createContext, useContext, useState, useEffect } from 'react'
import en from './locales/en.json'
import fr from './locales/fr.json'

const resources = { en, fr }
const I18nContext = createContext({ t: (k)=>k, locale: 'en', setLocale: ()=>{} })

export function I18nProvider({ children }){
  const [locale, setLocale] = useState(localStorage.getItem('locale') || 'en')

  useEffect(()=>{
    localStorage.setItem('locale', locale)
  },[locale])

  const t = (key)=>{
    const segs = key.split('.')
    let cur = resources[locale] || {}
    for(const s of segs){
      cur = cur?.[s]
      if (cur === undefined) return key
    }
    return typeof cur === 'string' ? cur : key
  }

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = ()=> useContext(I18nContext)
