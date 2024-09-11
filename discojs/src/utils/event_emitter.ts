// inspired by https://danilafe.com/blog/typescript_typesafe_events/

import { List } from 'immutable'

type Listener<T> = (_: T) => void | Promise<void>

/**
 * Call handlers on given events
 *
 * @typeParam I object/mapping from event name to emitted value type
 */
export class EventEmitter<I extends Record<string, unknown>> {
  // List of callbacks to run per event
  #listeners: {
    [E in keyof I]?: List<[once: boolean, _: Listener<I[E]>]>;
  } = {}
  // Keep a list of the previously emitted events
  // to allow subscribers to run callbacks on past events if needed
  #pastEvents: { [E in keyof I]?: List<I[E]> } = {}

  /**
   * @param initialListeners object/mapping of event name to listener, as if using `on` on created instance
   */
  constructor (
    initialListeners: {
      [E in keyof I]?: Listener<I[E]>;
    } = {}
  ) {
    for (const event in initialListeners) {
      const listener = initialListeners[event]
      if (listener !== undefined) {
        this.on(event, listener)
      }
    }
  }

  /**
   * Register listener to call on event. 
   * If onPastEvent is set to true, the listener is also ran on previously emitted events
   *
   * @param event event name to listen to
   * @param listener handler to call
   * @param onPastEvents if true run the listener on already emitted events
   */
  on<E extends keyof I>(event: E, listener: Listener<I[E]>, onPastEvents = false): void {
    if (onPastEvents) {
      const pastEvents = this.#pastEvents[event] ?? List()
      pastEvents.forEach(async value => await listener(value))
    }
    const eventListeners = this.#listeners[event] ?? List()
    this.#listeners[event] = eventListeners.push([false, listener])
  }

  /**
   * Register listener to call once on next event
   *
   * @param event event name to listen to
   * @param listener handler to call next time
   */
  once<E extends keyof I>(event: E, listener: Listener<I[E]>): void {
    const eventListeners = this.#listeners[event] ?? List()
    this.#listeners[event] = eventListeners.push([true, listener])
  }

  /**
   * Send value to registered listeners of event name
   *
   * @param event send to listeners of event name
   * @param value what to call listeners with
   */
  emit<E extends keyof I>(event: E, value: I[E]): void {
    const eventListeners = this.#listeners[event] ?? List()
    this.#listeners[event] = eventListeners.filterNot(([once]) => once)

    eventListeners.forEach(async ([_, listener]) => { await listener(value) })
    // Save the event and value
    const pastEvents = this.#pastEvents[event] ?? List()
    this.#pastEvents[event] = pastEvents.push(value)
  }
}

/** `EventEmitter` for all events */
export class Sink extends EventEmitter<Record<string, unknown>> {}
