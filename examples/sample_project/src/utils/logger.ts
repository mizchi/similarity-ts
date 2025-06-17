export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any): void {
    console.log(`[${this.getTimestamp()}] [INFO] [${this.context}] ${message}`, data || "");
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.getTimestamp()}] [WARN] [${this.context}] ${message}`, data || "");
  }

  error(message: string, error?: Error): void {
    console.error(`[${this.getTimestamp()}] [ERROR] [${this.context}] ${message}`, error || "");
  }

  debug(message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.debug(`[${this.getTimestamp()}] [DEBUG] [${this.context}] ${message}`, data || "");
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }
}
