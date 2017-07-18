/**
 * Created by thomasjeanneau on 20/03/2017.
 */

import _ from 'lodash'
import Promise from 'bluebird'

import { base } from './airtable/index'

const {
  AIRTABLE_MEMBERS,
  AIRTABLE_MOOD
} = process.env

if (!AIRTABLE_MEMBERS) {
  console.log('Error: Specify AIRTABLE_MEMBERS in a .env file')
  process.exit(1)
}

// reads all records from a table
const _getAllRecords = (select) => {
  return new Promise((resolve, reject) => {
    let allRecords = []
    select.eachPage(function page (records, fetchNextPage) {
      allRecords = allRecords.concat(records)
      fetchNextPage()
    }, function done (err) {
      if (err) return reject(err)
      resolve(allRecords)
    })
  })
}

// get slack user info by id
export const getSlackUser = async (bot, id) => {
  const apiUser = Promise.promisifyAll(bot.api.users)
  const {user} = await apiUser.infoAsync({user: id})
  return user
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
  const records = await _getAllRecords(base(AIRTABLE_MEMBERS).select({
    view: 'Main View',
    filterByFormula: `{Slack Handle} = '@${name}'`
  }))
  return records[0].id
}

export const saveMood = async (id, level, comment) => {
  const create = Promise.promisify(base(AIRTABLE_MOOD).create)
  await create({
    'Member': [id],
    'Level': parseInt(level, 10),
    'Comment': comment,
    'Date': Date.now()
  })
}
