import en from '@/messages/en.json'
import ko from '@/messages/ko.json'

const messages = { en, ko }

export function getMessages(locale) {
  return messages[locale] || messages.en
}

export function t(messages, key) {
  const keys = key.split('.')
  let value = messages
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return key // fallback to key if not found
    }
  }
  return value
}
