import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = process.env.INSIGHT_LOG_LEVEL?.toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray('[DEBUG]'), message);
      if (data) console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      console.log(chalk.blue('[INFO]'), message);
      if (data) console.log(data);
    }
  }

  warn(message: string, error?: Error | any): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(chalk.yellow('[WARN]'), message);
      if (error) console.warn(error);
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(chalk.red('[ERROR]'), message);
      if (error) {
        if (error instanceof Error) {
          console.error(chalk.red(error.stack));
        } else {
          console.error(chalk.red(JSON.stringify(error, null, 2)));
        }
      }
    }
  }

  success(message: string): void {
    console.log(chalk.green('✅'), message);
  }

  progress(message: string): void {
    console.log(chalk.cyan('⏳'), message);
  }
}

export const logger = new Logger();