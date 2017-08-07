/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'

import { base, _getAllRecords } from './airtable/index'

// get slack user info by id
export const getSlackUser = async (bot, id) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {user} = await apiUser.infoAsync({user: id})
  return user
}

// get member by id
export const getMember = async (id) => {
  const findMember = Promise.promisify(base('Users').find)
  const member = await findMember(id)
  return member
}

// get all slack members
export const getAllMembers = async (bot) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {members} = await apiUser.listAsync({token: bot.config.bot.app_token})
  _.remove(members, ({ id }) => checkIfBot(bot, id) === true)
  return members
}

// check if the id is one of a bot
export const checkIfBot = async (bot, id) => {
  if (id === 'USLACKBOT') return true
  const apiUsers = Promise.promisifyAll(bot.api.users)
  const {user: {is_bot: isBot}} = await apiUsers.infoAsync({token: bot.config.bot.app_token, user: id})
  return isBot
}

export const getIdFromName = async (name) => {
  const records = await _getAllRecords(base('Users').select({
    view: 'Main View',
    filterByFormula: `{Slack Handle} = '@${name}'`
  }))
  return records[0].id
}

export const saveMood = async (id, level, comment) => {
  const create = Promise.promisify(base('Moods').create)
  await create({
    'Member': [id],
    'Level': parseInt(level, 10),
    // treat "no" and "No" as empty comments, trimming whitespace
    'Comment': /^\s*no+\s*$/i.test(comment) ? '' : comment,
    'Date': Date.now()
  })
}

export const getMoods = async () => {
  const ping = Date.now() - 86400000
  const records = await _getAllRecords(base('Moods').select({
    view: 'Recent, by user',
    filterByFormula: `{Date} >= ${ping}`
  }))
  const list = _.map(records, r => r.fields)
  const moods = []
  for (let i = 0; i < list.length; i += 1) {
    let exist = false
    for (let j = 0; j < moods.length; j += 1) {
      if (list[i]['Member'][0] === moods[j]['Member'][0]) {
        exist = true
        if (list[i]['Date'] >= moods[j]['Date']) {
          moods[j] = list[i]
        }
      }
    }
    if (!exist) moods.push(list[i])
  }
  return moods
}

export const getEmoji = (level) => {
  switch (level) {
    case 1:
    case 2:
    case 3: {
      return ':sos:'
    }
    case 4:
    case 5:
    case 6: {
      return ':warning:'
    }
    case 7: {
      return ':slightly_smiling_face:'
    }
    case 8: {
      return ':simple_smile:'
    }
    case 9: {
      return ':smile:'
    }
    case 10: {
      return ':sunglasses:'
    }
    default: {
      return ':simple_smile: '
    }
  }
}

export const getColor = (level) => {
  switch (level) {
    case 1: return '#B71C1C'
    case 2: return '#D32F2F'
    case 3: return '#F44336'
    case 4: return '#F57F17'
    case 5: return '#FBC02D'
    case 6: return '#FFEB3B'
    case 7: return '#CDDC39'
    case 8: return '#9CCC65'
    case 9: return '#7CB342'
    case 10: return '#558B2F'
    default: return '#9CCC65'
  }
}
