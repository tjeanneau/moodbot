/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'

import { getBase, _getAllRecords } from './airtable/index'

// get slack user info by id
export const getSlackUser = async (bot, id) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {user} = await apiUser.infoAsync({user: id})
  return user
}

// get member by id
export const getMember = async (teamId, id) => {
  const base = await getBase(teamId)
  const findMember = Promise.promisify(base('Users').find)
  const member = await findMember(id)
  return member
}

// get all slack members
export const getAllMembers = async (bot) => {
  const registerUsers = []
  const base = await getBase(bot.config.id)
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {members} = await apiUser.listAsync({token: bot.config.bot.app_token})
  const records = await _getAllRecords(base('Users').select({
    view: 'Main view',
    filterByFormula: '{Moodbot Applicant}=1'
  }))
  records.forEach(function (record) {
    registerUsers.push(record.get('Slack Handle'))
  })
  _.remove(members, ({ name }) => {
    return registerUsers.indexOf(`@${name}`) === -1
  })
  return members
}

// get all slack members
export const getAllChannels = async (bot) => {
  const channels = []
  const base = await getBase(bot.config.id)
  const records = await _getAllRecords(base('Channels').select({
    view: 'Main view'
  }))
  records.forEach(function (record) {
    channels.push({
      name: record.get('Slack ID'),
      users: record.get('Users')
    })
  })
  return channels
}

export const getIdFromName = async (teamId, name) => {
  const base = await getBase(teamId)
  const records = await _getAllRecords(base('Users').select({
    view: 'Main view',
    filterByFormula: `{Slack Handle} = '@${name}'`
  }))
  return records[0].id
}

export const saveMood = async (teamId, id, level, comment) => {
  const base = await getBase(teamId)
  const create = Promise.promisify(base('Moods').create)
  await create({
    'User': [id],
    'Level': parseInt(level, 10),
    'Comment': /^\s*share+\s*$/i.test(comment) ? '' : comment,
    'Date': Date.now()
  })
}

export const getMoods = async (teamId, users) => {
  const base = await getBase(teamId)
  const ping = Date.now() - 86400000
  const records = await _getAllRecords(base('Moods').select({
    view: 'Recent, by user',
    filterByFormula: `{Date} >= ${ping}`
  }))
  const list = _.map(records, r => r.fields)
  _.remove(list, mood => users.indexOf(mood['User'][0]) === -1)
  const moods = []
  for (let i = 0; i < list.length; i += 1) {
    let exist = false
    for (let j = 0; j < moods.length; j += 1) {
      if (list[i]['User'][0] === moods[j]['User'][0]) {
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
