export class Logger {

    // Name used for logging
    static LOG_NAME

    // Current log level
    static LOG_LEVEL

    // Log levels
    static LOG_LEVELS = {
        NOTHING: 0,
        ERROR: 1,
        INFO: 2,
        DEBUG: 3,
        EVERYTHING: 4,
    }

    // Initlization function
    static init(logname, level) {
        this.LOG_NAME = logname;
        this.LOG_LEVEL = level;
    }

    static debug(...args) {
        if (this.LOG_LEVEL > this.LOG_LEVELS.INFO) console.debug(`[${this.LOG_NAME}] [DEBUG]`, ...args)
    }

    static info(...args) {
        if (this.LOG_LEVEL > this.LOG_LEVELS.ERROR) console.info(`[${this.LOG_NAME}] [INFO]`, ...args)
    }

    static error(...args) {
        if (this.LOG_LEVEL > this.LOG_LEVELS.NOTHING) console.error(`[${this.LOG_NAME}] [ERROR]`, ...args)
    }

    static log(...args) {
        if (this.LOG_LEVEL > this.LOG_LEVELS.NOTHING) console.log(`[${this.LOG_NAME}] [LOG]`, ...args)
    }
}
