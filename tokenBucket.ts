export default class TokenBucket {
  public tokens: number = 0               // 当前桶内令牌的数量
  private lastRefillTime: number =  Date.now();      // 上一次加令牌的时间

  constructor(private readonly capacity: number, private readonly rate: number) {}

  /**
   * 处理传入的请求，并返回是否允许通过
   */
  processRequest(): boolean {
    // 先加令牌
    const currentTime = Date.now();
    const timeElapsed = currentTime - this.lastRefillTime;
    const tokensToAdd = timeElapsed * this.rate / 1000;  // 生成令牌数量
    this.tokens = Math.min(this.tokens + tokensToAdd, this.capacity);  // 加完令牌后更新桶内令牌数量
    this.lastRefillTime = currentTime;

    // 判断是否允许通过
    if (this.tokens < 1) {
      // 限流
      return false;
    } else {
      // 通过
      this.tokens -= 1;
      return true;
    }
  }
}