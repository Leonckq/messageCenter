/**************************************************
 * Created by nanyuantingfeng on 20/12/2016 14:51.
 **************************************************/
export class MessageCenter {
  private __handlers: { [key: string]: Array<(...args: any[]) => any> } = {}

  private readonly __maxListeners: number = null

  private __watchHandlersMap = new WeakMap()

  private __getHandlerIndex(name: string, handler: (...args: any[]) => void): number {
    return this.has(name) ? this.__handlers[name].findIndex(fn => fn === handler) : -1
  }

  private __achieveMaxListener(name: string): boolean {
    return this.__maxListeners !== null && this.__maxListeners <= this.listenersLength(name)
  }

  private __handlerIsExists(name: string, handler: (...args: any[]) => void): boolean {
    const handlerInd = this.__getHandlerIndex(name, handler)
    const activeHandler = handlerInd !== -1 ? this.__handlers[name][handlerInd] : undefined
    return handlerInd !== -1 && !!activeHandler
  }

  private __on(name: string, handler: (...args: any[]) => void): this {
    if (typeof handler !== 'function') {
      throw new TypeError(`${handler} is not a function`)
    }

    if (this.has(name)) {
      // Check if we reached maximum number of listeners.
      if (this.__achieveMaxListener(name)) {
        console.warn(`Max listeners (${this.__maxListeners}) for event "${name}" is reached!`)
      }

      // Check if the same handler has already added.
      if (this.__handlerIsExists(name, handler)) {
        console.warn(`Event "${name}" already has the handler ${handler}.`)
      }
    } else {
      this.__handlers[name] = []
    }

    this.__handlers[name].push(handler)
    return this
  }

  private __un(name: string, handler?: (...args: any[]) => void) {
    if (this.has(name)) {
      if (handler) {
        handler = this.__getHandlerInMap(handler)
        const handlerInd = this.__getHandlerIndex(name, handler)
        if (handlerInd !== -1) {
          this.__handlers[name].splice(handlerInd, 1)
          this.__un(name, handler)
        }
      } else {
        this.__handlers[name] = null
      }
    }
    return this
  }

  private __emit(name: string, ...args: any[]): this {
    const custom = this.__handlers[name]
    let i = custom ? custom.length : 0

    while (i--) {
      custom[i](...args)
    }

    return this
  }

  private __setHandlerInMap(handler: (...args: any[]) => void, realHandler: (...args: any[]) => void) {
    this.__watchHandlersMap.set(handler, realHandler)
  }

  private __getHandlerInMap(handler: (...args: any[]) => void) {
    return this.__watchHandlersMap.has(handler) ? this.__watchHandlersMap.get(handler) : handler
  }

  private __prefixEventName(name: string): string {
    return `@@A0F2F71915C05BE72D17F48B2A49CEAD:${name}`
  }

  constructor(maxListeners?: number | string | null) {
    this.__maxListeners = maxListeners === null ? null : parseInt(String(maxListeners), 10)
  }

  has(name: string): boolean {
    return !!this.__handlers[name] && !!this.__handlers[name].length
  }

  on(name: string, handler: (...args: any[]) => void): this {
    name.split('|').forEach(e => e && this.__on(e, handler))
    return this
  }

  /*********************************************
   * 单次监听
   */
  once(name: string, handler: (...args: any[]) => void): this {
    let fn: (...args: any[]) => any
    fn = (...args: any[]) => {
      this.un(name, fn)
      return handler(...args)
    }
    return this.on(name, fn)
  }

  /*********************************************
   * 解除监听
   */
  un(name: string, handler?: (...args: any[]) => void): this {
    name.split('|').forEach(e => e && this.__un(e, handler))
    return this
  }

  /**********************************************
   * 触发监听
   */
  emit(name: string, ...args: any[]): this {
    name.split('|').forEach(e => e && this.__emit(e, ...args))
    return this
  }

  /******************************************
   * 清空当前实例中所有的监听
   */
  clear(): this {
    this.__handlers = {}
    return this
  }

  /****************************************
   * 检测监听器的长度
   * @param name
   * @returns {number}
   */
  listenersLength(name: string): number {
    return this.has(name) ? this.__handlers[name].length : 0
  }

  /*********************************
   * 等待结果返回
   */
  watch<T>(name: string, handler: (...args: any[]) => T): this {
    const fn = (...data: any[]) => {
      this.emit(this.__prefixEventName(name), handler(...data))
    }

    this.on(name, fn)
    this.__setHandlerInMap(handler, fn)
    return this
  }

  /*************************
   * 触发结果返回
   */
  invoke<T>(name: string, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.listenersLength(name)) {
        reject(`have no watcher at event(${name})`)
      }
      this.once(this.__prefixEventName(name), resolve)
      this.emit(name, ...args)
    })
  }
}

export default MessageCenter
