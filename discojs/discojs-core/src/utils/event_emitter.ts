// inspired by https://danilafe.com/blog/typescript_typesafe_events/

import { List } from 'immutable'

type Listener<T> = (_: T) => void

/**
 * Call handlers on given events
 *
 * @typeParam I object/mapping from event name to emitted value type
 */
export class EventEmitter<I extends Record<string, unknown>> {
  private listeners: {
    [E in keyof I]?: List<[once: boolean, _: Listener<I[E]>]>;
  } = {}

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
   * Register listener to call on event
   *
   * @param event event name to listen to
   * @param listener handler to call
   */
  on<E extends keyof I>(event: E, listener: Listener<I[E]>): void {
    const eventListeners = this.listeners[event] ?? List()
    this.listeners[event] = eventListeners.push([false, listener])
  }

  /**
   * Register listener to call once on next event
   *
   * @param event event name to listen to
   * @param listener handler to call next time
   */
  once<E extends keyof I>(event: E, listener: Listener<I[E]>): void {
    const eventListeners = this.listeners[event] ?? List()
    this.listeners[event] = eventListeners.push([true, listener])
  }

  /**
   * Send value to registered listeners of event name
   *
   * @param event send to listeners of event name
   * @param value what to call listeners with
   */
  emit<E extends keyof I>(event: E, value: I[E]): void {
    const eventListeners = this.listeners[event] ?? List()
    this.listeners[event] = eventListeners.filterNot(([once]) => once)

    eventListeners.forEach(([_, listener]) => {
      listener(value)
    })
  }
}

/** `EventEmitter` for all events */
export class Sink extends EventEmitter<Record<string, unknown>> {}
