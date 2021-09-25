/**
 * Bolt's middleware format follows a similar spec as Express. 
 */

const filterEvent = filterFn => async ({ event, next }) => {
    if (filterFn(event)) {
        await next()
    }
}

// Type checking for asynchronous middleware isn't completely done in the main repository yet, so make sure to export all of them casting to the any type.

export const filterChannel = id => (filterEvent(event => event.channel === id)) as any

export const filterChannelType = (type => filterEvent(event => event.channel_type === type)) as any

export const filterDM = (filterEvent(event => event.channel_type === 'im')) as any

export const filterNoBotMessages = (filterEvent(event => !('subtype' in event) || event.subtype !== 'bot_message')) as any

export const filterThreaded = ((shouldBeThreaded = true) => filterEvent(event => 'thread_ts' in event === shouldBeThreaded)) as any
