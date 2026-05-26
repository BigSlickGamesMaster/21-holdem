import { routeSocketEventToScene } from './socketReceiveRouter';

export function replaySocketEvents(oScene, events = []) {
    const aEvents = Array.isArray(events) ? events : [];

    return aEvents.map((event, index) => ({
        index,
        eventName: event?.sEventName || '',
        handled: routeSocketEventToScene(oScene, event),
    }));
}

export function getUnhandledReplayEvents(results = []) {
    return (Array.isArray(results) ? results : []).filter((result) => !result.handled);
}
